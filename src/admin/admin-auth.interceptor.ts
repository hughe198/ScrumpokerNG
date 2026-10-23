import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AdminService } from './admin.service';

// Adds the admin Bearer token to /api/admin requests (except login), and
// drops the stored session when the API says it's no longer valid.
export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const admin = inject(AdminService);
  if (!req.url.startsWith(admin.apiBase) || req.url.endsWith('/login')) {
    return next(req);
  }

  const token = admin.token;
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        admin.logout();
      }
      return throwError(() => error);
    }),
  );
};
