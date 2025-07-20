
import { ICommand } from './i-command';
import { ISendVote } from './i-send-votes';
import { IResults } from './i-results';
import { IError } from './i-error';
import { ISuccess } from './i-success';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ICardChange } from './i-card-change';
import { ISettings } from './i-settings';
import { environment } from './environments/environment';
import {IName} from './i-name'
import { stringify } from 'uuid';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private settings = new BehaviorSubject<ISettings>({
    type:"settings",
    reveal:false,
    votingCard:"fibonacci"
  }) 
  private results = new Subject<IResults>()
  private socket: WebSocket | null = null;
  private protocol:String = environment.wsssecure ? "wss" : "ws";
  
  private duplicateNameSubject = new Subject<boolean>()

  getDuplicateNameObservable():Observable<boolean>{
    return this.duplicateNameSubject.asObservable();
  }



  connect(roomID: string, voter:string) {
    const voterName:IName ={name:voter}
    this.socket = new WebSocket(`${this.protocol}://${environment.websocketBase}/ws/${roomID}`)
    this.socket.onopen = () => {
      console.log('Angular: Connected to websocket')
      this.socket?.send(JSON.stringify(voterName))
    }
    type WebSocketMessage = IResults | IError | ISuccess | ISettings;
    
    this.socket.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
     
      try{
        switch (data.type) {
          case "result":
            this.results.next(data)
            break
          case "error":
            console.error("error", data.error);
            if (data.error ==="New Name Needed"){
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
    catch (error){
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

  getSettings(){
    return this.settings.asObservable()
  }

  sendSettingsChange(message:ISettings){
    if (this.socket){
      if(this.socket.readyState == WebSocket.OPEN){
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

  requestDisconnect():void{
    const command:ICommand ={command:"Exit_room"}
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
    });

    this.results.next({
      type: "result",
      roomID: "", // Reset roomID
      votingCard: "fibonacci", // Default or empty votingCard
      votes: {}, // Empty votes object
    });
    // Complete subjects and resets states
    this.settings.complete();
    this.results.complete();
    this.settings = new BehaviorSubject<ISettings>({
      type: "settings",
      reveal: false,
      votingCard: "fibonacci",
  });
  this.results = new Subject<IResults>();
  }

  getVotes(): Observable<IResults> {
    return this.results.asObservable()
  }
  changeCards(card:ICardChange){
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(card))
      } else {
        console.error("Websocket connection is not open")
      } 
    }
  }
  
  private handleSuccessMessage(successMessage:string):void{
  switch (successMessage){
    case "Votes Cleared":{
        const buttons = document.querySelectorAll(".votingOption")
        buttons.forEach(button =>{
          button.classList.remove("voteSelected")
        })
        console.log("success", successMessage)
        break}
    case "Votes Revealed":{
      const buttons = document.querySelector("#revealButton")
      if (buttons?.innerHTML =="Reveal Votes"){
        buttons.innerHTML = "Conceal Votes"
      }else{
        buttons!.innerHTML ="Reveal Votes"
      }
      break
    }
    case "Exiting Room":{
      console.log("Disconnect Acknowledgement received")
      this.disconnect()
      break
    }
      default:
    break 
  }}



}
