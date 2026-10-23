import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminService, ADMIN_API_BASE } from './admin.service';
import { adminAuthInterceptor } from './admin-auth.interceptor';

describe('AdminService + adminAuthInterceptor', () => {
  let service: AdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([adminAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function logIn(expiresAt = Date.now() + 60_000): void {
    service.login('pw').subscribe();
    http.expectOne(`${ADMIN_API_BASE}/login`).flush({ token: 'tok', expiresAt });
  }

  it('stores the token on login and reports logged in', () => {
    expect(service.isLoggedIn()).toBeFalse();
    logIn();
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.token).toBe('tok');
  });

  it('treats an expired token as logged out', () => {
    logIn(Date.now() - 1);
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('does not send a token with the login request', () => {
    service.login('pw').subscribe();
    const req = http.expectOne(`${ADMIN_API_BASE}/login`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(req.request.body).toEqual({ password: 'pw' });
    req.flush({ token: 'tok', expiresAt: Date.now() + 60_000 });
  });

  it('adds the Bearer token to admin requests', () => {
    logIn();
    service.getRooms().subscribe();
    const req = http.expectOne(`${ADMIN_API_BASE}/rooms`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
    req.flush({ stats: {}, active: [], inactive: [] });
  });

  it('leaves non-admin requests alone', () => {
    logIn();
    TestBed.inject(HttpClient).get('/assets/something.json').subscribe();
    const req = http.expectOne('/assets/something.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('logs out when the API rejects the token', () => {
    logIn();
    service.getRooms().subscribe({ error: () => {} });
    http.expectOne(`${ADMIN_API_BASE}/rooms`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('closeRoom sends DELETE for that room', () => {
    logIn();
    service.closeRoom('abc').subscribe();
    const req = http.expectOne(`${ADMIN_API_BASE}/rooms/abc`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ closed: 'abc' });
  });

  it('checkSession maps failures to false', () => {
    let result: boolean | undefined;
    service.checkSession().subscribe(ok => result = ok);
    http.expectOne(`${ADMIN_API_BASE}/session`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(result).toBeFalse();
  });
});
