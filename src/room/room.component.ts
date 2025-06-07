
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
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { faSquare } from '@fortawesome/free-solid-svg-icons';

import { ISettings } from '../i-settings';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
@Component({
  selector: 'app-room',
  standalone: true,
  imports: [FormsModule, VotingCardComponent,FontAwesomeModule],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})


export class RoomComponent implements OnDestroy {

  faCoffee = faCoffee
  faCheckSquare = faCheckSquare
  faSquare = faSquare
  active:boolean = false
  
  private destroy$ = new Subject<void>();
  
  
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
  clearVotes = new Subject<void>()
  reveal:Boolean = false;
  constructor(private cdr:ChangeDetectorRef, private apiService: ApiService, private localstorage: LocalStorageService) {
    this.userDetails = localstorage.getUserDetails()    
  }
  ngOnDestroy(): void {
    this.disconnectRoom();
    console.log('RoomComponent Destroyed');
  }
  
  disconnectRoom(){
    const command:ICommand = {command:"Exit_room"}
    this.apiService.sendCommand(command)
    this.destroy$.next();
    this.destroy$.complete()
    this.destroy$ = new Subject<void>()
    console.log('RoomComponent Destroyed');
    

  }


  connectRoom() {
  const apiVotesConnection = this.apiService.getVotes()
  .pipe(takeUntil(this.destroy$));

  apiVotesConnection.subscribe({
    next: (data: IResults) => {
        this.results = data;
        this.votes = data.votes;
        var cleared:boolean = true;
        Object.values(this.votes).forEach(vote =>{
          if (vote != ""){
            cleared =false
          }
        })
        if (cleared){
          this.clearVotes.next()
        }
        
    },
    complete: () => {
        this.active = false; // Update UI state accordingly
  }
});

const apiSettings = this.apiService.getSettings()
  .pipe(takeUntil(this.destroy$));

apiSettings.subscribe({
  next: (data: ISettings) => {
      this.settings = data;
      this.reveal = this.settings.reveal

  },
  complete: () => {
      console.log('Settings subscription completed');
  }})
};

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
    this.clearVotes.next();
  }


}



