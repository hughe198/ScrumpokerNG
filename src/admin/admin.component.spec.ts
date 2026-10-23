import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { AdminComponent } from './admin.component';
import { AdminService } from './admin.service';
import { IAdminRoomDetail, IAdminRoomList, IAdminRoomSummary } from './i-admin';

describe('AdminComponent', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let component: AdminComponent;
  let admin: jasmine.SpyObj<AdminService>;
  let loggedIn: boolean;

  const now = Date.now();
  const summary = (roomID: string, voterCount: number): IAdminRoomSummary => ({
    roomID, voterCount, votedCount: 0, revealed: false, votingCard: 'Standard',
    timerState: null, createdAt: now, lastActivity: now, expiresAt: now + 86_400_000,
  });
  const list: IAdminRoomList = {
    stats: { activeRooms: 1, inactiveRooms: 1, connectedUsers: 2, uptimeSeconds: 30 },
    active: [summary('active-room-1', 2)],
    inactive: [summary('empty-room-2', 0)],
  };
  const detail: IAdminRoomDetail = {
    ...summary('active-room-1', 2),
    voters: [{ name: 'Alice', hasVoted: true }, { name: 'Bob', hasVoted: false }],
    reactionCount: 3, missileFiredBy: ['Alice'], timer: null,
  };

  function text(): string {
    fixture.detectChanges();
    return fixture.nativeElement.textContent;
  }

  beforeEach(async () => {
    loggedIn = false;
    admin = jasmine.createSpyObj<AdminService>('AdminService',
      ['isLoggedIn', 'login', 'logout', 'checkSession', 'getRooms', 'getRoom', 'closeRoom']);
    admin.isLoggedIn.and.callFake(() => loggedIn);
    admin.login.and.callFake(() => { loggedIn = true; return of(undefined); });
    admin.logout.and.callFake(() => { loggedIn = false; });
    admin.checkSession.and.returnValue(of(true));
    admin.getRooms.and.returnValue(of(list));
    admin.getRoom.and.returnValue(of(detail));
    admin.closeRoom.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [{ provide: AdminService, useValue: admin }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the login form when logged out', () => {
    expect(fixture.nativeElement.querySelector('input[type="password"]')).not.toBeNull();
    expect(admin.getRooms).not.toHaveBeenCalled();
  });

  it('shows a helpful message for a wrong password', () => {
    admin.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    component.password = 'bad';
    component.login();
    expect(text()).toContain('Wrong password.');
  });

  it('shows the rate-limit message', () => {
    admin.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    component.password = 'bad';
    component.login();
    expect(text()).toContain('Too many attempts');
  });

  it('after login, shows the summary with active and inactive rooms but no names', () => {
    component.password = 'pw';
    component.login();
    const page = text();

    expect(page).toContain('Active rooms');
    expect(page).toContain('Inactive rooms');
    expect(page).toContain('active-r');   // short room id
    expect(page).toContain('empty-ro');
    expect(page).not.toContain('Alice');
  });

  it('clicking a room shows who is in it and who has voted', () => {
    component.password = 'pw';
    component.login();
    component.toggleRoom(list.active[0]);
    const page = text();

    expect(admin.getRoom).toHaveBeenCalledWith('active-room-1');
    expect(page).toContain('Alice');
    expect(page).toContain('Bob');
    expect(page).toContain('Missiles fired');

    component.toggleRoom(list.active[0]);  // click again to collapse
    expect(text()).not.toContain('Alice');
  });

  it('close room asks for confirmation first', () => {
    component.password = 'pw';
    component.login();

    spyOn(window, 'confirm').and.returnValue(false);
    component.closeRoom(list.active[0]);
    expect(admin.closeRoom).not.toHaveBeenCalled();

    (window.confirm as jasmine.Spy).and.returnValue(true);
    component.closeRoom(list.active[0]);
    expect(admin.closeRoom).toHaveBeenCalledWith('active-room-1');
  });

  it('logging out returns to the login form', () => {
    component.password = 'pw';
    component.login();
    component.logout();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="password"]')).not.toBeNull();
  });
});
