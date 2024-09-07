import { Component, Input } from '@angular/core';
import { ApiService } from '../api.service';
import { LocalStorageService } from '../local-storage.service';
import { IUserDetails } from '../i-user-details';
import { IResults, IVotes } from '../i-results';
import { ISendVote as ISendVote } from '../i-send-votes';
import { CommonModule, NgFor } from '@angular/common';
@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule,NgFor],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})


export class RoomComponent {
  @Input() 
  set connection(active:boolean){
    if (active){this.connectRoom()}
  }
  votes!:IVotes
  results!:IResults 

  constructor(private apiService: ApiService, private localstorage: LocalStorageService) {
  }
  connectRoom(){
    const userDetails: IUserDetails | null = this.localstorage.getUserDetails()
    if (userDetails?.roomID) {
      this.apiService.connect(userDetails?.roomID)
      const joinRoom:ISendVote={voter:userDetails.voter,vote:""}
      this.apiService.sendVote(joinRoom)
      const room = this.apiService.getVotes()
      room.subscribe((data:IResults)=>{
        this.results = data
        this.votes = data.votes
        console.log("Subscribed results",this.results.votes)
      })
    }     
  }

}
