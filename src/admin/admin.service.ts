import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../environments/environment';
import { IAdminLogin, IAdminRoomDetail, IAdminRoomList } from './i-admin';

const TOKEN_KEY = 'adminToken';
const EXPIRES_KEY = 'adminTokenExpires';

// The API is served from the same host as the WebSocket, so derive its
// HTTP address from the existing environment settings.
export const ADMIN_API_BASE =
  `${environment.wsssecure ? 'https' : 'http'}://${environment.websocketBase}/api/admin`;

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  readonly apiBase = ADMIN_API_BASE;

  constructor(private http: HttpClient) {}

  // sessionStorage rather than localStorage: the login ends when the
  // browser (tab) is closed.
  get token(): string | null {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      const expires = Number(sessionStorage.getItem(EXPIRES_KEY));
      if (!token || !expires || expires <= Date.now()) {
        return null;
      }
      return token;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.token !== null;
  }

  login(password: string): Observable<void> {
    return this.http.post<IAdminLogin>(`${this.apiBase}/login`, { password }).pipe(
      tap(({ token, expiresAt }) => {
        try {
          sessionStorage.setItem(TOKEN_KEY, token);
          sessionStorage.setItem(EXPIRES_KEY, String(expiresAt));
        } catch (error) {
          console.log('Error saving admin session', error);
        }
      }),
      map(() => undefined),
    );
  }

  logout(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(EXPIRES_KEY);
    } catch {
      // nothing stored, nothing to remove
    }
  }

  // Confirms a stored token is still accepted (e.g. after an API restart
  // with a generated secret, old tokens stop working).
  checkSession(): Observable<boolean> {
    return this.http.get(`${this.apiBase}/session`).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  getRooms(): Observable<IAdminRoomList> {
    return this.http.get<IAdminRoomList>(`${this.apiBase}/rooms`);
  }

  getRoom(roomId: string): Observable<IAdminRoomDetail> {
    return this.http.get<IAdminRoomDetail>(`${this.apiBase}/rooms/${encodeURIComponent(roomId)}`);
  }

  closeRoom(roomId: string): Observable<void> {
    return this.http.delete(`${this.apiBase}/rooms/${encodeURIComponent(roomId)}`).pipe(map(() => undefined));
  }
}
