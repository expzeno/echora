import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, IonContent],
  template: `
    <ion-content>
      <div class="login-container">
        <div class="login-card">
          <div class="login-logo">
            <img src="assets/image/logo.svg" class="logo-img" alt="Logo"
                 (error)="onLogoError($event)" /><span class="logo-fallback" style="display:none;">Logo</span>
            <h1>Echora</h1>
            <p>Sign in to the Agent Dashboard</p>
            <div style="font-size: 11px; font-weight: 500; letter-spacing: 0.5px; text-align: center;"
                 [style.color]="isProd ? 'var(--ion-color-success, #22c55e)' : 'var(--ion-color-medium, #6c757d)'">
              {{ isProd ? 'LIVE' : 'DEV' }}
            </div>
          </div>

          @if (error()) {
            <div class="login-error">{{ error() }}</div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="login()">
            <div class="login-field">
              <label>Email</label>
              <input type="email" formControlName="email" placeholder="Enter your email" autocomplete="email" />
            </div>
            <div class="login-field">
              <label>Password</label>
              <input type="password" formControlName="password" placeholder="Enter your password" autocomplete="current-password" />
            </div>
            <button type="submit" class="login-btn" [disabled]="loading() || loginForm.invalid">
              {{ loading() ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          @if (!isProd) {
            <button type="button" class="login-demo-link" (click)="demoLogin()">
              Use demo credentials
            </button>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [``],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isProd = environment.production;
  readonly loading = signal(false);
  readonly error = signal('');

  readonly loginForm = new FormGroup({
    email: new FormControl(environment.production ? '' : 'admin@demo.com', [Validators.required, Validators.email]),
    password: new FormControl(environment.production ? '' : 'admin123', [Validators.required]),
  });

  demoLogin() {
    this.loginForm.patchValue({ email: 'admin@demo.com', password: 'admin123' });
    this.login();
  }

  onLogoError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const fallback = img.nextElementSibling as HTMLElement | null;
    if (fallback) fallback.style.display = 'flex';
  }

  async login() {
    if (this.loginForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const { email, password } = this.loginForm.getRawValue();
      const res = await this.auth.login(email!, password!);
      if (res.ok) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(res.message || 'Login failed');
      }
    } catch (e: any) {
      this.error.set(e.message || 'Login failed');
    } finally {
      this.loading.set(false);
    }
  }
}
