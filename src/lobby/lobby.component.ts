import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from '../local-storage.service';
import { v4 as uuidv4 } from 'uuid';
import { IUserDetails } from '../i-user-details';
import { FormsModule } from '@angular/forms';
import validator from 'validator'
import { RoomComponent } from "../room/room.component";
import { ApiService } from '../api.service';
import { ICommand } from '../i-command';
@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [FormsModule, RoomComponent],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css'
})
export class LobbyComponent implements OnInit {

  constructor(private localStorageService: LocalStorageService, private api:ApiService) { }

  voter: string = ""
  roomID: string | null = null
  votingCard: string | null = null
  localStorage: boolean = false
  active = false
  ngOnInit(): void {
    const local = this.localStorageService.getUserDetails()
    console.log("Local Storage:",local) 
    if (local !== null) {
      this.voter = local.voter
      this.roomID = local.roomID
      this.votingCard = local.votingCard
      this.localStorage = true
    } else {
      this.roomID = uuidv4();
      this.votingCard="Fibonacci"
    }
    console.log("Voter: ",this.voter,"roomID ",this.roomID,"votingCard: ",this.votingCard,"Local Storage: ",this.localStorage )
  }

  connect(voter: string, roomID: string | null, votingCard : string | null) {
    console.log("Connecting with:",this.roomID, this.voter)
    if (voter && roomID && votingCard && validator.isUUID(roomID)) {
      this.active = true
      const details: IUserDetails = { voter: voter, roomID: roomID, votingCard:votingCard}
      this.localStorageService.setUserDetails(details)
    }
    else {
      console.error('Invalid RoomID or Name  ', this.roomID)
      this.roomID = uuidv4();
    }
  }
  async createNewRoom() {
    this.api.requestDisconnect()
    this.roomID = uuidv4()
    if (this.voter && this.roomID && this.votingCard && validator.isUUID(this.roomID)) {
      this.active = false
      const details: IUserDetails = { voter: this.voter, roomID: this.roomID, votingCard:this.votingCard}
      this.localStorageService.setUserDetails(details)
  }
  this.active = true
  
}
}