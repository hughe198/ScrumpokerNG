import { ICommand } from './i-command';
import { ISendVote } from './i-vote';
import { IResults } from './i-results';
import { IError } from './i-error';
import { ISuccess } from './i-success';
import { IJoined } from './i-joined';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ICardChange } from './i-card-change';
import { ISettings, ISendSettingsUpdate, DEFAULT_SETTINGS } from './i-settings';
import { ISendReaction } from './i-reaction';
import { environment } from './environments/environment';
import { IName } from './i-name';
import { IMissileLaunch } from './i-missile';
import { ISendTimer } from './i-timer';

type OutgoingMessage = ISendVote | ICommand | ISendReaction | ICardChange | ISendSettingsUpdate | ISendTimer;

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private settings = new BehaviorSubject<ISettings>(DEFAULT_SETTINGS)
  private results = new Subject<IResults>()
  // One-off events, not state: a late subscriber should NOT replay an
  // old launch, hence Subject rather than BehaviorSubject.
  private missileLaunches = new Subject<IMissileLaunch>()
  // Holds this client's own server-assigned voter id once the "joined"
  // message arrives. BehaviorSubject (not Subject) so a component that
  // subscribes even slightly after the message arrives still gets it --
  // votes/settings can arrive in quick succession right after connect.
  private voterID = new BehaviorSubject<string | null>(null)
  private socket: WebSocket | null = null;
  private protocol: string = environment.wsssecure ? "wss" : "ws";
  // Messages sent while the socket is still CONNECTING. Flushed in
  // onopen, after the name handshake, which the server must see first.
  private pending: OutgoingMessage[] = [];

  private duplicateNameSubject = new Subject<boolean>()
  // Fires when an administrator closes the room (server close code 4001).
  private roomClosedSubject = new Subject<void>()

  getRoomClosed(): Observable<void> {
    return this.roomClosedSubject.asObservable();
  }

  getDuplicateNameObservable(): Observable<boolean> {
    return this.duplicateNameSubject.asObservable();
  }

  getVoterID(): Observable<string | null> {
    return this.voterID.asObservable();
  }

  connect(roomID: string, voter: string) {
    const voterName: IName = { type:"name", name: voter }
    this.socket = new WebSocket(`${this.protocol}://${environment.websocketBase}/ws/${roomID}`)
    this.socket.onopen = () => {
      console.log('Angular: Connected to websocket')
      this.socket?.send(JSON.stringify(voterName))
      this.pending.forEach(message => this.socket?.send(JSON.stringify(message)))
      this.pending = []
    }
    type WebSocketMessage = IJoined | IResults | IError | ISuccess | ISettings | IMissileLaunch;

    this.socket.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);

      try {
        switch (data.type) {
          case "joined":
            this.voterID.next(data.voterID)
            break
          case "result":
            this.results.next(data)
            break
          case "error":
            console.error("error", data.error);
            if (data.error === "New Name Needed") {
              this.duplicateNameSubject.next(true)
            }
            break
          case "success":
            this.handleSuccessMessage(data.success)
            break
          case "settings":
            this.settings.next(data)
            break
          case "missile":
            this.missileLaunches.next(data)
            break
          default:
            console.warn("Unknown message type:", data);
            break;
        }
      }
      catch (error) {
        console.log(error)
      }
    }
    this.socket!.onclose = (event) => {
      if (event.code === 4000) {
        this.duplicateNameSubject.next(true);
        console.log(true)
      }
      if (event.code === 4001) {
        this.roomClosedSubject.next();
      }
    }
  }

  getSettings() {
    return this.settings.asObservable()
  }

  // Single send path for every outgoing message. Previously each send*
  // method had its own copy of the readyState checks, and sendVote
  // replaced socket.onopen while CONNECTING -- which dropped the name
  // handshake, so the server never accepted the connection.
  private send(message: OutgoingMessage) {
    if (!this.socket) {
      console.error("Websocket is not connected")
      return
    }
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    } else if (this.socket.readyState === WebSocket.CONNECTING) {
      this.pending.push(message)
    } else {
      console.error("Websocket connection is not open")
    }
  }

  sendSettingsChange(message: ISendSettingsUpdate) {
    this.send(message)
  }

  sendVote(message: ISendVote) {
    this.send(message)
  }

  sendCommand(message: ICommand) {
    this.send(message)
  }

  sendReaction(message: ISendReaction) {
    this.send(message)
  }

  changeCards(card: ICardChange) {
    this.send(card)
  }

  sendTimer(message: ISendTimer) {
    this.send(message)
  }

  requestDisconnect(): void {
    const command: ICommand = { type: "command", command: "Exit_room" }
    this.sendCommand(command)
  }

  disconnect(): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close();
    }
    this.socket = null;
    this.pending = [];
    // Reset state on the SAME subjects rather than completing and
    // replacing them -- replacing left any existing subscriber attached
    // to a dead subject that would never emit again.
    this.settings.next(DEFAULT_SETTINGS);
    this.results.next({
      type: "result",
      roomID: "",
      votes: {},
    });
    this.voterID.next(null);
  }

  getVotes(): Observable<IResults> {
    return this.results.asObservable()
  }

  getMissileLaunches(): Observable<IMissileLaunch> {
    return this.missileLaunches.asObservable()
  }

  private handleSuccessMessage(successMessage: string): void {
    switch (successMessage) {
      // NOTE: "Votes Cleared" and "Votes Revealed" cases were removed --
      // the backend's Clear_votes/Reveal_votes command handlers only
      // broadcast votes/settings, they never send a success message, so
      // those branches could never actually fire. The UI they used to
      // (attempt to) drive is already correctly handled reactively:
      // reveal button text via the settings$ subscription (room.component's
      // `reveal` property), and vote-selection clearing via the
      // `clearVotes` Subject passed into <app-voting-card>.
      case "Exiting Room": {
        console.log("Disconnect Acknowledgement received")
        this.disconnect()
        break
      }
      default:
        break
    }
  }
}
