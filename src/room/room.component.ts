import { Component, Input } from '@angular/core';
import { ApiService } from '../api.service';
import { LocalStorageService } from '../local-storage.service';
import { IUserDetails } from '../i-user-details';
import { IResults } from '../i-results';
import { IVoter } from '../i-voter';
@Component({
  selector: 'app-room',
  standalone: true,
  imports: [],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})


export class RoomComponent {
  @Input() 
  set connection(active:boolean){
    if (active){this.connectRoom()}
  }
  votes!:IResults

  constructor(private apiService: ApiService, private localstorage: LocalStorageService) {
  }
  connectRoom(){
    const userDetails: IUserDetails | null = this.localstorage.getUserDetails()
    if (userDetails?.roomID) {
      this.apiService.connect(userDetails?.roomID)
      const joinRoom:IVoter={voter:userDetails.voter,vote:""}
      this.apiService.sendVote(joinRoom)
      const room = this.apiService.getVotes()
      room.subscribe((data)=>{
        this.votes = data
        console.log("Subscribed results",this.votes)
      })
    }
  }

}
