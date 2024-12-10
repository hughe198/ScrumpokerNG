import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from '../local-storage.service';
import { v4 as uuidv4 } from 'uuid';
import { IUserDetails } from '../i-user-details';
import { FormsModule } from '@angular/forms';
import validator from 'validator'
import { RoomComponent } from "../room/room.component";
@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [FormsModule, RoomComponent],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css'
})
export class LobbyComponent implements OnInit {

  constructor(private localStorageService: LocalStorageService) { }

  voter: string | null = ""
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
      this.votingCard="fibonacci"
    }
    console.log("Voter: ",this.voter,"roomID ",this.roomID,"votingCard: ",this.votingCard,"Local Storage: ",this.localStorage )
  }

  connect(name: string | null, roomID: string | null, votingCard : string | null) {
    console.log(this.localStorage)
    if (name && roomID && votingCard && validator.isUUID(roomID)) {
      this.active = true
      const details: IUserDetails = { voter: name, roomID: roomID, votingCard:votingCard}
      this.localStorageService.setUserDetails(details)
    }
    else {
      console.error('Invalid RoomID or Name  ', this.roomID)
      this.roomID = uuidv4();
    }
  }
  createNewRoom() {
    this.roomID = uuidv4()
  }





}
