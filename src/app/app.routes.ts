import { Routes } from '@angular/router';
import { LobbyComponent } from '../lobby/lobby.component';
import { RoomComponent } from '../room/room.component';

export const routes: Routes = [
    {path:'', component:LobbyComponent},
    {path:'room/:roomId', component:RoomComponent},
    {path:'**', redirectTo:''} // fallback
];
