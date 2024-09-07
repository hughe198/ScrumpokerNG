import { Injectable } from '@angular/core';
import { ICommand } from './i-command';
import { ISendVote } from './i-send-votes';
import { Observable, Subject } from 'rxjs';
import { IResults } from './i-results';
import { IError } from './i-error';
import { ISuccess } from './i-success';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private results = new Subject<IResults>
  socket?: WebSocket
  connect(roomID: string): void {
    this.socket = new WebSocket(`ws://127.0.0.1:8000/ws/${roomID}`)
    this.socket.onopen = () => {
      console.log('Angular: Connected to websocket')
    }
    type WebSocketMessage = IResults | IError | ISuccess;
    this.socket.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data)
      switch (data.type) {
        case "result":
          this.results.next(data)
          break
        case "error":
          console.error("error", data.error);
          break
        case "success":
          console.log("success", data.success)
          break
        default:
          console.warn("Unknown message type:", data);
          break;
      }

    }
    this.socket.onclose = () => {
      console.log('Angular:Websocket closed')
    }
    this.socket.onerror = (error) => {
      console.error('Websocket Error', error)
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
  getVotes(): Observable<IResults> {
    return this.results.asObservable()
  }

}
