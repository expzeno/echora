import { Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';
import { ApiBaseService } from './api-base.service';
import { Global, AdminUser } from './global';
import { Router } from '@angular/router';

const STORAGE_KEY = 'auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiBaseService);
  private readonly global = inject(Global);
  private readonly router = inject(Router);

  async login(email: string, password: string): Promise<any> {
    const res: any = await firstValueFrom(
      this.api.post('/access/login', { email, password })
    );
    if (res.ok) {
      const tokenObj = res.token;
      this.global.token.set(tokenObj.token);
      this.global.refreshToken.set(tokenObj.refreshToken);
      this.global.user.set(res.profile);

      await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify({
        token: tokenObj.token,
        refreshToken: tokenObj.refreshToken,
        profile: res.profile,
      })});
    }
    return res;
  }

  async loadProfile(): Promise<any> {
    try {
      const res: any = await firstValueFrom(this.api.get('/access/profile'));
      if (res.ok) {
        this.global.user.set(res.profile);
      }
      return res;
    } catch {
      return { ok: false };
    }
  }

  async refreshTokenCall(): Promise<boolean> {
    const rt = this.global.refreshToken();
    if (!rt) return false;
    try {
      const res: any = await firstValueFrom(
        this.api.post('/access/refreshToken', { refreshToken: rt })
      );
      if (res.ok && res.token) {
        this.global.token.set(res.token);
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify({
          token: res.token,
          refreshToken: rt,
          profile: this.global.user(),
        })});
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async initAuth(): Promise<void> {
    this.global.loading.set(true);
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        const stored = JSON.parse(value);
        this.global.token.set(stored.token);
        this.global.refreshToken.set(stored.refreshToken);
        this.global.user.set(stored.profile);

        const profileRes = await this.loadProfile();
        if (!profileRes.ok) {
          const refreshed = await this.refreshTokenCall();
          if (refreshed) {
            await this.loadProfile();
          } else {
            await this.logout();
          }
        }
      }
    } catch (e) {
      console.error('[Auth] init error', e);
    } finally {
      this.global.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    this.global.token.set(null);
    this.global.refreshToken.set(null);
    this.global.user.set(null);
    await Preferences.remove({ key: STORAGE_KEY });
    this.router.navigate(['/login']);
  }
}
