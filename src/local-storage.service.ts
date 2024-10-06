import { Injectable } from '@angular/core';
import { IUserDetails } from './i-user-details';
@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  setUserDetails(details:IUserDetails): void {
  try {
    if (!(details.roomID === null) && !(details.voter === null)){
      localStorage.setItem("roomID",details.roomID)
      localStorage.setItem("voter",details.voter)
      localStorage.setItem("votingCard",details.votingCard)
    }
  } catch (error) {
    console.log("Error saving to localStorage",error)
  }
}
  
  getUserDetails():IUserDetails | null{
    const roomID = localStorage.getItem("roomID")
    const voter = localStorage.getItem("voter")
    const votingCard = localStorage.getItem("votingCard")

    if ((roomID !== null) && (voter !== null)&& (votingCard !== null)){
      let details: IUserDetails = {roomID: roomID,voter:voter,votingCard:votingCard}
      return details
    }
    return null

  }
}
