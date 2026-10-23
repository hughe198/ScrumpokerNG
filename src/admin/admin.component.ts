import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { AdminService } from './admin.service';
import { IAdminRoomDetail, IAdminRoomList, IAdminRoomSummary } from './i-admin';
import { ThemeToggleComponent } from '../app/theme-toggle/theme-toggle.component';

const REFRESH_MS = 10_000;

// /admin: password login, then a summary of active and inactive rooms.
// Clicking a room loads its details (who's in it, who has voted).
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, ThemeToggleComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  password = '';
  loginError: string | null = null;
  loggingIn = false;

  rooms: IAdminRoomList | null = null;
  loadError: string | null = null;
  lastRefreshed: number | null = null;

  selectedRoomId: string | null = null;
  detail: IAdminRoomDetail | null = null;
  detailError: string | null = null;

  private refresher?: Subscription;

  constructor(private admin: AdminService) {}

  get loggedIn(): boolean {
    return this.admin.isLoggedIn();
  }

  ngOnInit(): void {
    if (this.loggedIn) {
      // A stored token may have been invalidated by an API restart.
      this.admin.checkSession().subscribe(ok => ok ? this.startRefreshing() : this.admin.logout());
    }
  }

  ngOnDestroy(): void {
    this.refresher?.unsubscribe();
  }

  login(): void {
    if (!this.password || this.loggingIn) {
      return;
    }
    this.loggingIn = true;
    this.loginError = null;
    this.admin.login(this.password).subscribe({
      next: () => {
        this.password = '';
        this.loggingIn = false;
        this.startRefreshing();
      },
      error: (error: HttpErrorResponse) => {
        this.loggingIn = false;
        this.loginError = error.status === 429 ? 'Too many attempts. Try again in a minute.'
          : error.status === 401 ? 'Wrong password.'
          : error.status === 404 ? 'Admin is not enabled on the server (ADMIN_PASSWORD not set).'
          : 'Could not reach the server.';
      },
    });
  }

  logout(): void {
    this.admin.logout();
    this.refresher?.unsubscribe();
    this.rooms = null;
    this.selectRoom(null);
  }

  refresh(): void {
    if (!this.loggedIn) {
      this.refresher?.unsubscribe();
      return;
    }
    this.admin.getRooms().subscribe({
      next: rooms => {
        this.rooms = rooms;
        this.loadError = null;
        this.lastRefreshed = Date.now();
      },
      error: () => this.loadError = 'Could not load rooms.',
    });
    if (this.selectedRoomId) {
      this.loadDetail(this.selectedRoomId);
    }
  }

  toggleRoom(room: IAdminRoomSummary): void {
    this.selectRoom(this.selectedRoomId === room.roomID ? null : room.roomID);
  }

  closeRoom(room: IAdminRoomSummary): void {
    const people = room.voterCount === 1 ? '1 person' : `${room.voterCount} people`;
    const warning = room.voterCount > 0 ? ` ${people} will be disconnected.` : '';
    if (!confirm(`Close room ${this.shortId(room.roomID)}?${warning}`)) {
      return;
    }
    this.admin.closeRoom(room.roomID).subscribe({
      next: () => {
        this.selectRoom(null);
        this.refresh();
      },
      error: () => this.detailError = 'Could not close the room.',
    });
  }

  roomLink(roomId: string): string {
    return `${location.origin}/room/${roomId}`;
  }

  copyLink(roomId: string): void {
    navigator.clipboard?.writeText(this.roomLink(roomId)).catch(() => {});
  }

  // -- Formatting -------------------------------------------------------

  shortId(roomId: string): string {
    return roomId.slice(0, 8);
  }

  ago(ms: number): string {
    const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (seconds < 60) return 'just now';
    return `${this.span(seconds)} ago`;
  }

  inTime(ms: number): string {
    const seconds = Math.round((ms - Date.now()) / 1000);
    return seconds <= 0 ? 'now' : `in ${this.span(seconds)}`;
  }

  uptime(seconds: number): string {
    return seconds < 60 ? `${seconds}s` : this.span(seconds);
  }

  private span(seconds: number): string {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h`;
    return `${Math.floor(seconds / 86_400)} d`;
  }

  // -- Internals --------------------------------------------------------

  private startRefreshing(): void {
    this.refresh();
    this.refresher?.unsubscribe();
    this.refresher = interval(REFRESH_MS).subscribe(() => this.refresh());
  }

  private selectRoom(roomId: string | null): void {
    this.selectedRoomId = roomId;
    this.detail = null;
    this.detailError = null;
    if (roomId) {
      this.loadDetail(roomId);
    }
  }

  private loadDetail(roomId: string): void {
    this.admin.getRoom(roomId).subscribe({
      next: detail => {
        if (this.selectedRoomId === roomId) {
          this.detail = detail;
          this.detailError = null;
        }
      },
      error: (error: HttpErrorResponse) => {
        if (this.selectedRoomId === roomId) {
          this.detailError = error.status === 404 ? 'This room no longer exists.' : 'Could not load room details.';
        }
      },
    });
  }
}
