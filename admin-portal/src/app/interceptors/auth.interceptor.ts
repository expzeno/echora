import { HttpInterceptorFn, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Global } from '../services/global';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../environments/environment';

let refreshInFlight: Promise<string | null> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const global = inject(Global);
  const router = inject(Router);
  const http = inject(HttpClient);

  const skipUrls = ['/access/login', '/access/refreshToken', '/public/'];
  if (skipUrls.some((u) => req.url.includes(u))) {
    return next(req);
  }

  const token = global.token();
  let authReq = req;
  if (token && !req.headers.has('Authorization')) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !global.refreshToken()) {
        return throwError(() => error);
      }

      if (!refreshInFlight) {
        refreshInFlight = performRefresh(http, global.refreshToken()!)
          .then(async (newToken) => {
            if (!newToken) return null;
            global.token.set(newToken);
            await Preferences.set({ key: 'auth', value: JSON.stringify({
              token: newToken,
              refreshToken: global.refreshToken(),
              profile: global.user(),
            })});
            return newToken;
          })
          .catch(() => null)
          .finally(() => {
            queueMicrotask(() => { refreshInFlight = null; });
          });
      }

      return from(refreshInFlight).pipe(
        switchMap((newToken) => {
          if (!newToken) {
            global.token.set(null);
            global.refreshToken.set(null);
            global.user.set(null);
            Preferences.remove({ key: 'auth' });
            router.navigate(['/login']);
            return throwError(() => error);
          }
          const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
          return next(retryReq);
        }),
      );
    }),
  );
};

async function performRefresh(http: HttpClient, refreshToken: string): Promise<string | null> {
  try {
    const result: any = await new Promise((resolve, reject) => {
      http.post<any>(`${environment.apiUrl}/access/refreshToken`, {
        data: { refreshToken },
      }).subscribe({ next: resolve, error: reject });
    });
    return result?.ok && typeof result.token === 'string' ? result.token : null;
  } catch {
    return null;
  }
}
