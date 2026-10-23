import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { adminAuthInterceptor } from '../admin/admin-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Only the admin page makes HTTP calls; the rest of the app uses the WebSocket.
    provideHttpClient(withInterceptors([adminAuthInterceptor])),
  ]
};
