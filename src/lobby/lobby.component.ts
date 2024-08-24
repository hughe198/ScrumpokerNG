import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from '../local-storage.service';
import { v4 as uuidv4 } from 'uuid';
@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css'
})
export class LobbyComponent implements OnInit{

  constructor(private localStorageService:LocalStorageService){}

name : string | null  = null
roomID : string | null = null
localStorage: boolean = false
active = false
ngOnInit(): void {
  const local = this.localStorageService.getUserDetails()
  if (local !== null){
    this.name = local.voter
    this.roomID = local.roomID
    this.localStorage = true
  } else {
    this.roomID = uuidv4();
  }
}

connect(name: string| null, roomID: string | null){
  if (name && roomID){
    this.active = true
  }
}







}
