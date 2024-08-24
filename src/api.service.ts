import { Injectable } from '@angular/core';
import { ICommand } from './i-command';
import { IVoter } from './i-voter';
import { Observable, Subject } from 'rxjs';
import { IResults } from './i-results';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private messageSubject = new Subject<IResults>
  socket?: WebSocket 
  connect(roomID:string):void {
    this.socket =  new WebSocket(`ws://127.0.0.1:8000/ws/${roomID}`)
    this.socket.onopen = ()=>{
      console.log('Angular: Connected to websocket')
    }
    this.socket.onmessage = (event)=>{
      const data:IResults = JSON.parse(event.data)
      this.messageSubject.next(data)
    }
    this.socket.onclose =() =>{
      console.log('Angular:Websocket closed')
    }
    this.socket.onerror = (error) => {
      console.error('Websocket Error',error)
    }
  }
  sendVote(message:IVoter){
    if (this.socket){
    if (this.socket.readyState === WebSocket.OPEN){
      this.socket.send(JSON.stringify(message))
    } else {
      console.error("Websocket connection is not open")
      }}
    }
  sendCommand(message:ICommand){
    if (this.socket){
    if (this.socket.readyState === WebSocket.OPEN){
      this.socket.send(JSON.stringify(message))
    } else {
      console.error("Websocket connection is not open")
      }}
    }
  getVotes():Observable<IResults>{
    return this.messageSubject.asObservable()
  }

  }
