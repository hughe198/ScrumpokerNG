
import { ApiService } from '../api.service';
import { LocalStorageService } from '../local-storage.service';
import { IUserDetails } from '../i-user-details';
import { IResults, IVotes } from '../i-results';
import { ISendVote as ISendVote } from '../i-send-votes';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VotingCardComponent } from "./voting-card/voting-card.component";
import { ICardChange } from '../i-card-change';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [FormsModule, VotingCardComponent],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})


export class RoomComponent {
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
  reveal:boolean = true
  voteString: string = ""
  cardChoice: string
  userDetails: IUserDetails | null
  constructor(private apiService: ApiService, private localstorage: LocalStorageService) {
    this.userDetails = localstorage.getUserDetails()
    this.cardChoice = this.userDetails?.votingCard ?? "fibonacci"

  }
  connectRoom() {
    const userDetails: IUserDetails | null = this.localstorage.getUserDetails()
    if (userDetails?.roomID) {
      this.apiService.connect(userDetails?.roomID)
      const joinRoom: ISendVote = { voter: userDetails.voter, vote: ""}
      this.apiService.sendVote(joinRoom)
      const room = this.apiService.getVotes()
      room.subscribe((data: IResults) => {
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

}



