import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from '../local-storage.service';
import { v4 as uuidv4 } from 'uuid';
import { IUserDetails } from '../i-user-details';
import { FormsModule } from '@angular/forms';
import validator from 'validator'
import { RoomComponent } from "../room/room.component";
import { ApiService } from '../api.service';
import { ICommand } from '../i-command';
import { Router } from '@angular/router';
@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css'
})
export class LobbyComponent implements OnInit {

  constructor(private localStorageService: LocalStorageService, private api:ApiService, private router:Router ) { }

  voter: string = ""
  roomID: string | null = null
  votingCard: string | null = null
  localStorage: boolean = false
  active = false
  duplicateNameError = false;
  ngOnInit(): void {
    this.api.getDuplicateNameObservable().subscribe((isDuplicate)=>{
      if (isDuplicate){
        this.active = false
        this.duplicateNameError = true;
        this.voter = ""
      }
            setTimeout(() => {
        this.duplicateNameError = false;
      }, 2000);
    })

    const local = this.localStorageService.getUserDetails()
    if (
          local &&
          typeof local.voter === 'string' &&
          local.voter.trim() !== '' &&
          typeof local.roomID === 'string' &&
          validator.isUUID(local.roomID) &&
          typeof local.votingCard === 'string' &&
          local.votingCard.trim() !== ''
        )
        {
      this.voter = local.voter
      this.roomID = local.roomID
      this.votingCard = local.votingCard
      this.localStorage = true
    } else {
      this.roomID = uuidv4();
      this.votingCard="Fibonacci"
    }
    // console.log("Voter: ",this.voter,"roomID ",this.roomID,"votingCard: ",this.votingCard,"Local Storage: ",this.localStorage )
  }





  connect(voter: string, roomID: string | null, votingCard : string | null) {
    console.log("Connecting with:",this.roomID, this.voter)
    if (voter && roomID && votingCard && validator.isUUID(roomID)) {
      var details: IUserDetails = { voter: voter, roomID: roomID, votingCard:votingCard}
      this.localStorageService.setUserDetails(details)
      this.router.navigate(['/room',roomID])
    } else {
      this.roomID = uuidv4();

    }
  }
  createNewRoom() {
    this.roomID = uuidv4()
    if (this.voter && this.roomID && this.votingCard && validator.isUUID(this.roomID)) {
      const details: IUserDetails = { voter: this.voter, roomID: this.roomID, votingCard:this.votingCard}
      this.localStorageService.setUserDetails(details)
  }
}

  disconnect(){
    this.api.requestDisconnect()
  }
  
}