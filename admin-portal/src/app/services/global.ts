import { Injectable, signal, computed } from '@angular/core';

export interface AdminUser {
  id: number;
  displayName: string;
  email: string;
  role: string;
  [key: string]: any;
}

export interface TokenObj {
  token: string;
  refreshToken: string;
  expiresIn?: string;
  refreshExpiresIn?: string;
}

@Injectable({ providedIn: 'root' })
export class Global {
  readonly token = signal<string | null>(null);
  readonly refreshToken = signal<string | null>(null);
  readonly user = signal<AdminUser | null>(null);
  readonly loading = signal(true);
  readonly darkMode = signal(false);

  readonly isAuthenticated = computed(() => !!this.token());
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
  readonly displayName = computed(() => this.user()?.displayName || this.user()?.email || '');
}
