import { ApiService } from '../api.service';
import { LocalStorageService } from '../local-storage.service';
import { IUserDetails } from '../i-user-details';
import { IResults } from '../i-results';
import { IVoteRecord, ISendVote } from '../i-vote';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VotingCardComponent } from "./voting-card/voting-card.component";
import { ICardChange } from '../i-card-change';
import { ICommand } from '../i-command';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome'
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { faSquare } from '@fortawesome/free-solid-svg-icons';
import { ThemeToggleComponent } from '../app/theme-toggle/theme-toggle.component';
import { ISettings } from '../i-settings';
import {  Subject, take, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { BarchartComponent } from "./barchart/barchart.component";
import { Statistics } from '../i-statistics';

// IVotes was previously exported from i-results.ts; votes are now typed
// inline there as { [voterId: string]: IVoteRecord }. Local alias so the
// rest of this component doesn't need to repeat the map shape everywhere.
type VotesMap = { [voterId: string]: IVoteRecord };

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [FormsModule, VotingCardComponent, FontAwesomeModule, BarchartComponent, ThemeToggleComponent],
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
  // Server-assigned id for this connection, received via the "joined"
  // message. Votes/reactions are keyed by this, not by display name --
  // see setGongofShame() and voted() below.
  myVoterID: string | null = null
  votes!: VotesMap
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
  isLoading : boolean = true
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

    if (this.roomId && userDetails?.displayName){
      // User has both roomId and saved voter name - connect directly
      this.userName = userDetails.displayName;
      this.api.connect(this.roomId,userDetails.displayName)
      this.connectRoom()
    } else if (this.roomId && !userDetails?.displayName) {
      // User has roomId but no saved voter name - show modal to enter name
      this.showVoterModal = true;
    }
    })

  }
  ngOnDestroy(): void {
    this.disconnectRoom();
    console.log('RoomComponent Destroyed');
  }

  disconnectRoom(){
    const command:ICommand = { type: "command", command:"Exit_room" }
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
       if (votes.voter !== this.myVoterID) {
         hasOtherVoters = true;
         if (votes.vote === "") {
           allOthersVoted = false;
         }
       }
       if (votes.voter === this.myVoterID && votes.vote === "") {
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
  const apiVoterID = this.api.getVoterID()
    .pipe(takeUntil(this.destroy$));

apiVoterID.subscribe({
  next: (id: string | null) => {
    this.myVoterID = id;
  }
});

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
      this.reveal = data.reveal
      this.cdr.markForCheck();
  },
  complete: () => {
      console.log('Settings subscription completed');
  }})
};

  objectKeys(obj: VotesMap): string[] {
    if (obj){
    return Object.keys(obj)
    }else{return []}
  }

  voted(value: string) {
    this.voteString = value
    if (!this.myVoterID) {
      console.error("Cannot cast vote: own voter id not yet known (joined message not received)")
      return
    }
    const vote: ISendVote = { type: "vote", voter: this.myVoterID, vote: value }
    this.api.sendVote(vote)
  }
  votingCardChange(card: string) {
    const userDetails = this.localstorage.getUserDetails()
    if (userDetails) {
      userDetails.votingCard = card
      this.localstorage.setUserDetails(userDetails)
    }
    const cardChange:ICardChange = { type: "cardChange", card: card }
    this.api.changeCards(cardChange)
  }

  revealClicked( ){
    const command:ICommand = { type: "command", command:"Reveal_votes" }
    this.api.sendCommand(command)

  }

  clearClicked(){
    const clearCommand:ICommand = { type: "command", command:"Clear_votes" }
    this.api.sendCommand(clearCommand)
    // Reveal_votes TOGGLES server-side rather than setting an explicit
    // value, so only send it here if votes are currently revealed --
    // otherwise clearing while hidden would incorrectly flip reveal on.
    if (this.reveal) {
      const revealCommand:ICommand = { type: "command", command:"Reveal_votes" }
      this.api.sendCommand(revealCommand)
    }
    this.clearVotes.next();

  }

sortVotes(data: VotesMap): { key: string, value: any }[] {
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
      userID: "",
      displayName: trimmedName,
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

handleStatsChange(stats:Statistics){
  this.currentStats = stats

}



}
