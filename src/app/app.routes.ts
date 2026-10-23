import { Routes } from '@angular/router';
import { LobbyComponent } from '../lobby/lobby.component';
import { RoomComponent } from '../room/room.component';

export const routes: Routes = [
    {path:'', component:LobbyComponent},
    {path:'room/:roomId', component:RoomComponent},
    // Lazy-loaded so the admin page adds nothing to the main bundle.
    {path:'admin', loadComponent: () => import('../admin/admin.component').then(m => m.AdminComponent)},
    {path:'**', redirectTo:''} // fallback
];
