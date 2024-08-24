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
    }
  } catch (error) {
    console.log("Error saving to localStorage",error)
  }
}
  
  getUserDetails():IUserDetails | null{
    const roomID = localStorage.getItem("roomID")
    const voter = localStorage.getItem("voter")
    if ((roomID !== null) && (voter !== null)){
      let details: IUserDetails = {roomID: roomID,voter:voter}
      return details
    }
    return null

  }
}
