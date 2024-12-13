
import { ApiService } from '../api.service';
import { LocalStorageService } from '../local-storage.service';
import { IUserDetails } from '../i-user-details';
import { IResults, IVotes } from '../i-results';
import { ISendVote as ISendVote } from '../i-send-votes';
import { Component, Input, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VotingCardComponent } from "./voting-card/voting-card.component";
import { ICardChange } from '../i-card-change';
import { ICommand } from '../i-command';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome'
import { faC, faCoffee } from '@fortawesome/free-solid-svg-icons';
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
  }
  name: string = ""
  votes!: IVotes
  results!: IResults
  reveal:boolean = false
  voteString: string = ""
  cardChoice: string
  userDetails: IUserDetails | null
  constructor(private apiService: ApiService, private localstorage: LocalStorageService) {
    this.userDetails = localstorage.getUserDetails()
    this.cardChoice = this.userDetails?.votingCard ?? "fibonacci"
    
  }
  ngOnDestroy(): void {
    this.reveal = !this.reveal
    const command:ICommand ={command:"Exit_room"}
    this.apiService.sendCommand(command)
  }
  connectRoom() {
    const userDetails: IUserDetails | null = this.localstorage.getUserDetails()
    console.log("Room local User Details:",this.userDetails)
    if (userDetails?.roomID) {
      this.apiService.connect(userDetails?.roomID)
      const joinRoom: ISendVote = { voter: userDetails.voter, vote: ""} //initial vote send to update all users cards.
      this.apiService.sendVote(joinRoom)
      const apiVotesConnection = this.apiService.getVotes() //
      if (this.userDetails?.votingCard){
        this.cardChoice = userDetails.votingCard
      }
        else{
          this.cardChoice = "fibonacci"
        }
      console.log("Room card choice",this.cardChoice)
      apiVotesConnection.subscribe((data: IResults) => {
        this.results = data
        this.votes = data.votes
        this.reveal = data.reveal
        if (this.cardChoice != data.votingCard ){
        console.log("Subscribed card change:", this.results.votingCard)
        this.cardChoice = data.votingCard
        }
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
    this.reveal = !this.reveal
    const command:ICommand ={command:"Reveal_votes"}
    this.apiService.sendCommand(command)
  }

  clearClicked(){
    const command:ICommand ={command:"Clear_votes"}
    this.apiService.sendCommand(command)
    // const buttons = document.querySelectorAll(".votingOption")
    // buttons.forEach(button =>{
    //   button.classList.remove("voteSelected")
    // })
  }



}



