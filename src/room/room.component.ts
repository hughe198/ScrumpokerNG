
import { ApiService } from '../api.service';
import { LocalStorageService } from '../local-storage.service';
import { IUserDetails } from '../i-user-details';
import { IResults, IVotes } from '../i-results';
import { ISendVote as ISendVote } from '../i-send-votes';
import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VotingCardComponent } from "./voting-card/voting-card.component";
import { ICardChange } from '../i-card-change';
import { ICommand } from '../i-command';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome'
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { faSquare } from '@fortawesome/free-solid-svg-icons';
import { ThemeToggleComponent } from '../app/theme-toggle/theme-toggle.component';
import { ReactionCardComponent } from './reaction-card/reaction-card.component';
import { ISettings } from '../i-settings';
import {  Subject, take, takeUntil } from 'rxjs';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { LobbyComponent } from '../lobby/lobby.component';
import { BarchartComponent } from "./barchart/barchart.component";
@Component({
  selector: 'app-room',
  standalone: true,
  imports: [FormsModule, VotingCardComponent, FontAwesomeModule, BarchartComponent, ThemeToggleComponent, ReactionCardComponent],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})


export class RoomComponent implements OnDestroy, OnInit {



  faCoffee = faCoffee
  faCheckSquare = faCheckSquare
  faSquare = faSquare
  active:boolean = false
  
  private destroy$ = new Subject<void>(); 
  userName: string = ""
  votes!: IVotes
  emoji:string = ""
  results!: IResults
  settings: ISettings | null = null
  voteString: string = ""
  userDetails: IUserDetails | null
  clearVotes = new Subject<void>()
  reveal:Boolean = false;
  sortedVotes!:IVotes;
  roomId!:string | null;
  showVoterModal = false;
  constructor(private cdr:ChangeDetectorRef, private api: ApiService, private localstorage: LocalStorageService, private route:ActivatedRoute, private router:Router) {
    this.userDetails = localstorage.getUserDetails()    
  }
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.roomId = params.get('roomId')
      const userDetails = this.localstorage.getUserDetails();
    
    if (this.roomId && userDetails?.voter){
      // User has both roomId and saved voter name - connect directly
      this.userName = userDetails.voter;
      this.api.connect(this.roomId,userDetails.voter)
      this.connectRoom()
    } else if (this.roomId && !userDetails?.voter) {
      // User has roomId but no saved voter name - show modal to enter name
      this.showVoterModal = true;
    }
    })

    // Duplicate name handling is now in submitName() method

  }
  ngOnDestroy(): void {
    this.disconnectRoom();
    console.log('RoomComponent Destroyed');
  }
  
  disconnectRoom(){
    const command:ICommand = {command:"Exit_room"}
    this.api.sendCommand(command)
    this.destroy$.next();
    this.destroy$.complete()
    this.destroy$ = new Subject<void>()
    console.log('RoomComponent Destroyed');
    this.router.navigate(['/'])
    

  }


  connectRoom() {
  const apiVotesConnection = this.api.getVotes()
  .pipe(takeUntil(this.destroy$));

  apiVotesConnection.subscribe({
    next: (data: IResults) => {
        this.results = data;
        this.votes = data.votes;
        var cleared:boolean = true
        console.log(this.results)
        this.sortedVotes = this.sortVotes(data.votes)

        Object.values(this.votes).forEach(vote =>{
          if (vote.vote != ""){
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

const apiSettings = this.api.getSettings()
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
    const vote: ISendVote = { voter: this.userName, vote: value,emoji: this.emoji}
    this.api.sendVote(vote)
  }
  votingCardChange(card: string) {
    const userDetails = this.localstorage.getUserDetails()
    if (userDetails) {
      userDetails.votingCard = card
      this.localstorage.setUserDetails(userDetails)
    }
    const cardChange:ICardChange = {Card_Change:card}
    this.api.changeCards(cardChange)
  }

  revealClicked( ){
    const revealButton = document.querySelector("#revealButton")
    const command:ICommand ={command:"Reveal_votes"}
    this.api.sendCommand(command)
    this.sortedVotes = this.sortVotes(this.votes)
    console.log(JSON.stringify(this.sortedVotes))
  }

  clearClicked(){
    const command:ICommand ={command:"Clear_votes"}
    this.api.sendCommand(command)
    this.clearVotes.next();
    this.revealClicked()
    
  }

sortVotes(data:IVotes):IVotes {
  // Is the voting data numeric, or text based- i.e number or t-shirt sizes
  const isDataNumeric = (val:string)=> !isNaN(Number(val)) && val.trim() !== ""
  
  var sortedData = Object.entries(data).sort(([,voteA],[,voteB])=>{
    const aIsNum = isDataNumeric(voteA.vote)
    const bIsNum = isDataNumeric(voteB.vote)

    if (aIsNum && bIsNum) return Number(voteA) - Number(voteB); // returns a value +ve means A before B and vice versa
    if (!aIsNum && !bIsNum) return voteA.vote.length - voteB.vote.length
    return aIsNum ? -1 : 1 //if it reaches here, one is a string, one a num, it sorts numbers hgher
  })

// change array back into object and return
return sortedData.reduce<IVotes>((acc, [key, val]) => {
  acc[key] = val;
  return acc;
}, {});
}

submitName():void{
  const trimmedName = this.userName.trim()
  if (this.roomId && trimmedName){
    // Close modal and save details first
    this.showVoterModal = false;
    this.localstorage.setUserDetails({
      voter: trimmedName,
      roomID: this.roomId,
      votingCard: 'Standard'
    });
    
    // Set up duplicate name handling
    const duplicateNameSub = this.api.getDuplicateNameObservable().pipe(take(1)).subscribe(isDuplicate => {
      if(isDuplicate){
        // Reopen modal and clear the name for re-entry
        this.showVoterModal = true;
        this.userName = '';
        console.log("Duplicate name detected, please try another name");
      }
    });
    
    // Connect and set up room subscriptions
    this.api.connect(this.roomId, trimmedName);
    this.connectRoom();
  }
  else{
    console.log("Error: missing room ID or name")
  }
}

exitRoom(){
  this.api.disconnect()
  this.router.navigate([''])
}

updateEmoji(emoji:string){
  this.emoji = emoji
  const vote: ISendVote = { voter: this.userName, vote: this.voteString,emoji: this.emoji}
  console.log(vote)
  this.api.sendVote(vote)
}


}