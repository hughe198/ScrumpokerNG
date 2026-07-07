import { ICommand } from './i-command';
import { ISendVote } from './i-vote';
import { IResults } from './i-results';
import { IError } from './i-error';
import { ISuccess } from './i-success';
import { IJoined } from './i-joined';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ICardChange } from './i-card-change';
import { ISettings, ISendSettingsUpdate } from './i-settings';
import { ISendReaction } from './i-reaction';
import { environment } from './environments/environment';
import { IName } from './i-name';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private settings = new BehaviorSubject<ISettings>({
    type: "settings",
    reveal: false,
    votingCard: "fibonacci",
    reactions: {},
    missile_used_by: [],
  })
  private results = new Subject<IResults>()
  // Holds this client's own server-assigned voter id once the "joined"
  // message arrives. BehaviorSubject (not Subject) so a component that
  // subscribes even slightly after the message arrives still gets it --
  // votes/settings can arrive in quick succession right after connect.
  private voterID = new BehaviorSubject<string | null>(null)
  private socket: WebSocket | null = null;
  private protocol: string = environment.wsssecure ? "wss" : "ws";

  private duplicateNameSubject = new Subject<boolean>()

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
    }
    type WebSocketMessage = IJoined | IResults | IError | ISuccess | ISettings;

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
    }
  }

  getSettings() {
    return this.settings.asObservable()
  }

  sendSettingsChange(message: ISendSettingsUpdate) {
    if (this.socket) {
      if (this.socket.readyState == WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message))
      }
    }
  }

  sendVote(message: ISendVote) {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message))
      } else if (this.socket.readyState === WebSocket.CONNECTING) {
        // If the socket is still connecting, wait for it to open
        this.socket.onopen = () => {
          this.socket?.send(JSON.stringify(message));
        }
      }
      else {
        console.error("Websocket connection is not open")
      }
    }
  }

  sendCommand(message: ICommand) {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message))
      } else {
        console.error("Websocket connection is not open")
      }
    }
  }

  sendReaction(message: ISendReaction) {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message))
      } else {
        console.error("Websocket connection is not open")
      }
    }
  }

  requestDisconnect(): void {
    const command: ICommand = { type: "command", command: "Exit_room" }
    this.sendCommand(command)
  }

  disconnect(): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close();
      this.socket = null;
    }
    this.settings.next({
      type: "settings",
      reveal: false,
      votingCard: "fibonacci",
      reactions: {},
      missile_used_by: [],
    });

    this.results.next({
      type: "result",
      roomID: "", // Reset roomID
      votes: {}, // Empty votes object
    });
    // Complete subjects and resets states
    this.settings.complete();
    this.results.complete();
    this.settings = new BehaviorSubject<ISettings>({
      type: "settings",
      reveal: false,
      votingCard: "fibonacci",
      reactions: {},
      missile_used_by: [],
    });
    this.results = new Subject<IResults>();
    this.voterID.next(null);
  }

  getVotes(): Observable<IResults> {
    return this.results.asObservable()
  }

  changeCards(card: ICardChange) {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(card))
      } else {
        console.error("Websocket connection is not open")
      }
    }
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
