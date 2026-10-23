import { Injectable } from '@angular/core';
import { IUserDetails } from './i-user-details';
@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  setUserDetails(details:IUserDetails): void {
    try {
      if (!(details.roomID === null) && !(details.displayName === null)){
        localStorage.setItem("roomID",details.roomID)
        localStorage.setItem("voter",details.displayName)
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
      let details: IUserDetails = {userID: "", roomID: roomID,displayName:voter,votingCard:votingCard}
      return details
    }
    return null

  }

  changeVotingCard(change:string){
    localStorage.setItem('votingCard',change)
  }

  // Client-side half of the once-per-room missile rule. The server is the
  // real check (by display name); this only keeps the button disabled if
  // the user rejoins the same room under a different name.
  hasFiredMissile(roomID: string): boolean {
    try {
      return localStorage.getItem(`missileFired:${roomID}`) === "true"
    } catch {
      return false
    }
  }

  // Per-browser mute for the discussion timer's alarm (all rooms).
  isTimerAlarmMuted(): boolean {
    try {
      return localStorage.getItem("timerAlarmMuted") === "true"
    } catch {
      return false
    }
  }

  setTimerAlarmMuted(muted: boolean): void {
    try {
      localStorage.setItem("timerAlarmMuted", String(muted))
    } catch (error) {
      console.log("Error saving to localStorage", error)
    }
  }

  markMissileFired(roomID: string): void {
    try {
      localStorage.setItem(`missileFired:${roomID}`, "true")
    } catch (error) {
      console.log("Error saving to localStorage", error)
    }
  }


}
