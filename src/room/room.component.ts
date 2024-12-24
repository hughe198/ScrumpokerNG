
import { ApiService } from '../api.service';
import { LocalStorageService } from '../local-storage.service';
import { IUserDetails } from '../i-user-details';
import { IResults, IVotes } from '../i-results';
import { ISendVote as ISendVote } from '../i-send-votes';
import { ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VotingCardComponent } from "./voting-card/voting-card.component";
import { ICardChange } from '../i-card-change';
import { ICommand } from '../i-command';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome'
import { faC, faCoffee } from '@fortawesome/free-solid-svg-icons';
import { ISettings } from '../i-settings';
@Component({
  selector: 'app-room',
  standalone: true,
  imports: [FormsModule, VotingCardComponent,FontAwesomeModule],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})


export class RoomComponent implements OnDestroy {

  faCoffee = faCoffee
  active:boolean = false
  @Input()
  set connection(active: boolean) {
    if (active) {
      this.active = active
      this.connectRoom()
      const userDetails: IUserDetails | null = this.localstorage.getUserDetails()
      this.name = userDetails!.voter
    }
    else{
      this.active = false
      console.log("RoomComponent: Disconnected");
    }
  }
  
  name: string = ""
  votes!: IVotes
  results!: IResults
  settings!:ISettings
  voteString: string = ""
  userDetails: IUserDetails | null
  constructor(private cdr:ChangeDetectorRef, private apiService: ApiService, private localstorage: LocalStorageService) {
    this.userDetails = localstorage.getUserDetails()    
  }
  ngOnDestroy(): void {
    const command:ICommand ={command:"Exit_room"}
    this.apiService.sendCommand(command)
  }
  
  connectRoom() {
    const userDetails: IUserDetails | null = this.localstorage.getUserDetails()
    console.log("Room local User Details:",this.userDetails)
    this.name = this.localstorage.getUserDetails()?.voter ?? ""
    if (userDetails?.roomID) {
      const apiVotesConnection = this.apiService.getVotes() //
      apiVotesConnection.subscribe((data: IResults) => {
        this.results = data
        this.votes = data.votes
      })
      const apiSettings = this.apiService.getSettings()
      apiSettings.subscribe((data:ISettings)=>{
        this.settings = data
      })
    }
  }

  objectKeys(obj: IVotes): string[] {
    if (obj){
    return Object.keys(obj)
    }else{return []}
  }

  voted(value: string) {
    this.voteString = value
    const vote: ISendVote = { voter: this.name, vote: value}
    this.apiService.sendVote(vote)
  }
  votingCardChange(card: string) {
    const userDetails = this.localstorage.getUserDetails()
    if (userDetails) {
      userDetails.votingCard = card
      this.localstorage.setUserDetails(userDetails)
    }
    const cardChange:ICardChange = {Card_Change:card}
    this.apiService.changeCards(cardChange)
  }

  revealClicked( ){
    const revealButton = document.querySelector("#revealButton")
    const command:ICommand ={command:"Reveal_votes"}
    this.apiService.sendCommand(command)
  }

  clearClicked(){
    const command:ICommand ={command:"Clear_votes"}
    this.apiService.sendCommand(command)
  }



}



