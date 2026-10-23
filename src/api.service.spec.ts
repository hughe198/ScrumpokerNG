import { TestBed } from '@angular/core/testing';

import { ApiService } from './api.service';
import { DEFAULT_SETTINGS, ISettings } from './i-settings';

// Stand-in for the browser WebSocket so tests can control readyState and
// fire onopen by hand. Only the members ApiService touches are faked.
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readyState: number = WebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(data: string) { this.sent.push(data); }
  close() { this.readyState = WebSocket.CLOSED; }
  open() {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }
}

describe('ApiService', () => {
  let service: ApiService;
  let realWebSocket: typeof WebSocket;

  beforeEach(() => {
    realWebSocket = window.WebSocket;
    FakeWebSocket.instances = [];
    // Keep the CONNECTING/OPEN/CLOSED constants the service compares against.
    (window as any).WebSocket = Object.assign(FakeWebSocket, {
      CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3,
    });
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiService);
  });

  afterEach(() => {
    window.WebSocket = realWebSocket;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('queues a vote sent while connecting and sends it after the name handshake', () => {
    service.connect('room-1', 'Alice');
    const socket = FakeWebSocket.instances[0];

    service.sendVote({ type: 'vote', voter: 'id-1', vote: '5' });
    expect(socket.sent).toEqual([]);

    socket.open();

    expect(socket.sent.map(s => JSON.parse(s).type)).toEqual(['name', 'vote']);
  });

  it('sends immediately once the socket is open', () => {
    service.connect('room-1', 'Alice');
    const socket = FakeWebSocket.instances[0];
    socket.open();

    service.sendCommand({ type: 'command', command: 'Reveal_votes' });

    expect(JSON.parse(socket.sent[1])).toEqual({ type: 'command', command: 'Reveal_votes' });
  });

  it('resets settings on disconnect without completing the stream', () => {
    const received: ISettings[] = [];
    let completed = false;
    service.getSettings().subscribe({
      next: s => received.push(s),
      complete: () => completed = true,
    });
    service.connect('room-1', 'Alice');
    const socket = FakeWebSocket.instances[0];
    socket.onmessage?.({ data: JSON.stringify({ ...DEFAULT_SETTINGS, reveal: true }) });

    service.disconnect();

    expect(completed).toBeFalse();
    expect(received[received.length - 1]).toEqual(DEFAULT_SETTINGS);
  });
});
