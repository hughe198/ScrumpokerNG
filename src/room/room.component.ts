
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
import { Statistics } from '../i-statistics';
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
  sortedVotes: { key: string, value: any }[] = [];
  roomId!:string | null;
  showVoterModal = false;
  gongOfShame = false
  setGong = false
  gongPermissionGranted = false;
  currentStats!:Statistics
  private gongAudio!: HTMLAudioElement
  constructor(private cdr:ChangeDetectorRef, private api: ApiService, private localstorage: LocalStorageService, private route:ActivatedRoute, private router:Router) {
    this.userDetails = localstorage.getUserDetails()    
  }
  ngOnInit(): void {
    this.gongAudio = new Audio('assets/sounds/gong.mp3');
    this.gongAudio.volume = 1.0;
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

  enableGongSounds(){
    this.gongAudio.volume = 0;
    this.gongAudio.play().then(()=>{
      this.gongAudio.pause();
      this.gongAudio.currentTime =0
      this.gongAudio.volume = 1.0
      this.gongPermissionGranted = true
      console.log("Gong sound permission granted")
    }).catch(err =>{
      console.warn("Sound permission denied",err)
    })
  }
 

   setGongofShame(data: IResults): boolean {
     let hasOtherVoters = false;
     let allOthersVoted = true;
     let youHaveNotVoted = false;
     
     Object.values(data.votes).forEach(votes => {
       if (votes.voter !== this.userName) {
         hasOtherVoters = true;
         if (votes.vote === "") {
           allOthersVoted = false;
         }
       }
       if (votes.voter === this.userName && votes.vote === "") {
         youHaveNotVoted = true;
       }
     });
     
     return hasOtherVoters && allOthersVoted && youHaveNotVoted;
   }

  toggleGong() {
  this.setGong = !this.setGong;
  
  // If turning ON and permission not yet granted, request it
  if (this.setGong && !this.gongPermissionGranted) {
    this.enableGongSounds();
  }
  
  // If turning OFF, stop any playing gong
  if (!this.setGong) {
    this.stopGong();
  }
}

  triggerGong(){
    if (!this.gongPermissionGranted) return
    this.gongAudio.currentTime = 0
    this.gongAudio.play().catch(err =>{console.warn("Failed to play gong",err)})
    
  }

  stopGong(){
    this.gongAudio.pause()
    this.gongAudio.currentTime = 0
  }





  connectRoom() {
  const apiVotesConnection = this.api.getVotes()
  .pipe(takeUntil(this.destroy$));

apiVotesConnection.subscribe({
  next: (data: IResults) => {
    // 1. Update Data
    this.results = data;
    this.votes = data.votes;
    
    // 2. Handle Display Logic (Sorting)
    this.sortedVotes = this.sortVotes(data.votes);

    // 3. Handle Sound Logic (Gong)
    const currentGongState = this.setGongofShame(data);
    // Only trigger gong on the "rising edge" (when it changes from false to true)
    if (currentGongState && !this.gongOfShame) {
      this.triggerGong();
    }
    this.gongOfShame = currentGongState;

    // 4. Handle Clear Logic
    const allVotesEmpty = Object.values(this.votes).every(v => v.vote === "");
    if (allVotesEmpty) {
      this.clearVotes.next();
    }

    // 5. Force UI Update for WebSocket message
    this.cdr.markForCheck();
  },
  error: (err) => {
    console.error('WebSocket Error:', err);
    this.active = false;
  }
  // complete: is omitted because the socket is an open stream
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
    const command:ICommand ={command:"Reveal_votes"}
    this.api.sendCommand(command)

  }

  clearClicked(){
    var command:ICommand ={command:"Clear_votes"}
    this.api.sendCommand(command)
    command ={command:"Reveal_votes"}
    this.api.sendCommand(command)
    this.clearVotes.next();   

  }

sortVotes(data: IVotes): { key: string, value: any }[] {
  // Define weights for non-numeric votes so they sort logically
  const weights: Record<string, number> = { 
    "XXL": 100, "XL": 90, "L": 80, "M": 70, "S": 60, "XS": 50, "☕": 0, "?": -1 
  };

  const isDataNumeric = (val: string) => !isNaN(Number(val)) && val.trim() !== "";

  return Object.entries(data)
    .sort(([, a], [, b]) => {
      const valA = isDataNumeric(a.vote) ? Number(a.vote) : (weights[a.vote] || 0);
      const valB = isDataNumeric(b.vote) ? Number(b.vote) : (weights[b.vote] || 0);

      // Descending order: B - A
      return valB - valA;
    })
    .map(([key, value]) => ({ key, value }));
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

handleStatsChange(stats:Statistics){
  this.currentStats = stats

}



}