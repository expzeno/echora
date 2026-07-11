import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

interface WhatsAppNumber {
  id: string;
  phone: string;        // display-formatted, e.g. +60 12-345 6789
  label: string;
  active: boolean;
  lastActivity: string; // human string, e.g. "2 hours ago"
}

@Component({
  selector: 'app-whatsapp-numbers',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
      <div class="wa-shell">

        <!-- ── STATE B: connected numbers list ─────────────────────── -->
        @if (showList()) {
          <div class="wa-head">
            <div class="wa-head-text">
              <h1 class="wa-title">WhatsApp Numbers</h1>
              <p class="wa-subtitle">Manage your connected inboxes</p>
            </div>
            <button class="wa-btn wa-btn--primary" (click)="openModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              Connect Number
            </button>
          </div>

          <div class="wa-list">
            @for (n of numbers(); track n.id) {
              <div class="wa-card">
                <div class="wa-card-icon" [class.wa-card-icon--off]="!n.active">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z"
                      stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                    <path d="M8.5 9.2c0-.5.4-.9.9-.9h.7c.3 0 .6.2.7.5l.5 1.4c.1.3 0 .6-.2.8l-.5.5a6 6 0 0 0 2.6 2.6l.5-.5c.2-.2.5-.3.8-.2l1.4.5c.3.1.5.4.5.7v.7c0 .5-.4.9-.9.9A7.8 7.8 0 0 1 8.5 9.2Z"
                      fill="currentColor" />
                  </svg>
                </div>

                <div class="wa-card-body">
                  <div class="wa-card-row">
                    <span class="wa-phone">{{ n.phone }}</span>
                    <span class="wa-badge" [class.wa-badge--on]="n.active" [class.wa-badge--off]="!n.active">
                      <span class="wa-badge-dot"></span>{{ n.active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div class="wa-card-row wa-card-meta">
                    <span class="wa-label">{{ n.label }}</span>
                    <span class="wa-dot-sep">•</span>
                    <span class="wa-activity">Last activity {{ n.lastActivity }}</span>
                  </div>
                </div>

                <div class="wa-actions">
                  <button class="wa-link" type="button">Rename</button>
                  <button class="wa-link" type="button">{{ n.active ? 'Deactivate' : 'Activate' }}</button>
                  <button class="wa-link wa-link--danger" type="button">Delete</button>
                </div>
              </div>
            }
          </div>
        }

        <!-- ── STATE A: empty ──────────────────────────────────────── -->
        @else {
          <div class="wa-empty">
            <div class="wa-empty-card">
              <div class="wa-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z"
                    stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                  <path d="M8.5 9.2c0-.5.4-.9.9-.9h.7c.3 0 .6.2.7.5l.5 1.4c.1.3 0 .6-.2.8l-.5.5a6 6 0 0 0 2.6 2.6l.5-.5c.2-.2.5-.3.8-.2l1.4.5c.3.1.5.4.5.7v.7c0 .5-.4.9-.9.9A7.8 7.8 0 0 1 8.5 9.2Z"
                    fill="currentColor" />
                </svg>
              </div>
              <h2 class="wa-empty-title">No WhatsApp Numbers Connected</h2>
              <p class="wa-empty-sub">Connect your first WhatsApp number to start receiving conversations.</p>
              <button class="wa-btn wa-btn--primary wa-btn--lg" (click)="openModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
                Connect Number
              </button>
            </div>
          </div>
        }

        <!-- ── CONNECT MODAL ───────────────────────────────────────── -->
        @if (modalOpen()) {
          <div class="wa-backdrop" (click)="closeModal()">
            <div class="wa-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
                 aria-labelledby="wa-modal-title">
              <button class="wa-modal-close" type="button" (click)="closeModal()" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>

              <h2 id="wa-modal-title" class="wa-modal-title">Connect WhatsApp Number</h2>

              <div class="wa-field">
                <label class="wa-field-label" for="wa-phone-input">Phone number</label>
                <input
                  id="wa-phone-input"
                  class="wa-input"
                  type="tel"
                  inputmode="tel"
                  [ngModel]="phoneInput()"
                  (ngModelChange)="phoneInput.set($event)"
                  placeholder="+60 1X-XXX XXXX" />
              </div>

              <div class="wa-qr">
                <div class="wa-qr-box">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" stroke="currentColor" stroke-width="1.6" />
                    <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" />
                  </svg>
                  <span class="wa-qr-text">QR code will appear here</span>
                </div>
              </div>

              <p class="wa-qr-instructions">Scan with WhatsApp on your phone to link this number</p>

              <div class="wa-modal-actions">
                <button class="wa-btn wa-btn--ghost" type="button" (click)="closeModal()">Cancel</button>
                <button class="wa-btn wa-btn--primary" type="button" (click)="closeModal()">Connect</button>
              </div>
            </div>
          </div>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    ion-content { --background: var(--app-bg); }

    .wa-shell {
      min-height: 100%;
      padding: 28px 32px;
      background: var(--app-bg);
    }

    /* ── page header ──────────────────────────────────────────── */
    .wa-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 24px;
    }
    .wa-title {
      font-family: var(--font-display);
      font-size: 24px; font-weight: 700; letter-spacing: -0.5px;
      color: var(--admin-text); margin: 0;
    }
    .wa-subtitle {
      font-size: 14px; color: var(--admin-text-secondary); margin: 4px 0 0;
    }

    /* ── buttons ──────────────────────────────────────────────── */
    .wa-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 16px; border-radius: var(--radius-md);
      font-family: var(--font-body); font-size: 14px; font-weight: 600;
      border: 1px solid transparent; cursor: pointer;
      transition: filter .15s, background .15s, border-color .15s;
    }
    .wa-btn--lg { padding: 11px 22px; font-size: 15px; }
    .wa-btn--primary {
      background: var(--brand-primary); color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .wa-btn--primary:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(76,79,224,0.32); }
    .wa-btn--primary:active { filter: brightness(0.96); }
    .wa-btn--ghost {
      background: transparent; color: var(--admin-text-secondary);
      border-color: var(--border);
    }
    .wa-btn--ghost:hover { background: var(--surface-2); color: var(--admin-text); }

    /* ── list of number cards ─────────────────────────────────── */
    .wa-list { display: flex; flex-direction: column; gap: 12px; }
    .wa-card {
      display: flex; align-items: center; gap: 16px;
      padding: 16px 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      transition: border-color .15s, box-shadow .15s;
    }
    .wa-card:hover { border-color: rgba(76,79,224,0.4); box-shadow: 0 2px 12px rgba(0,0,0,0.18); }

    .wa-card-icon {
      width: 42px; height: 42px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md);
      background: rgba(34,200,192,0.14); color: var(--brand-secondary);
    }
    .wa-card-icon--off { background: var(--surface-2); color: var(--admin-text-muted); }

    .wa-card-body { flex: 1; min-width: 0; }
    .wa-card-row { display: flex; align-items: center; gap: 10px; }
    .wa-card-meta { margin-top: 4px; }

    .wa-phone {
      font-family: var(--font-mono); font-size: 15px; font-weight: 600;
      color: var(--admin-text); white-space: nowrap;
    }
    .wa-label { font-size: 13px; color: var(--admin-text-secondary); font-weight: 500; }
    .wa-dot-sep { color: var(--admin-text-muted); font-size: 12px; }
    .wa-activity { font-size: 12.5px; color: var(--admin-text-muted); }

    /* ── status badge ─────────────────────────────────────────── */
    .wa-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 10px; border-radius: var(--radius-full);
      font-size: 12px; font-weight: 600; letter-spacing: 0.2px;
    }
    .wa-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .wa-badge--on  { background: rgba(52,211,153,0.14); color: var(--status-live); }
    .wa-badge--off { background: var(--surface-2); color: var(--admin-text-muted); }

    /* ── row actions ──────────────────────────────────────────── */
    .wa-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .wa-link {
      background: transparent; border: none; cursor: pointer;
      padding: 6px 10px; border-radius: var(--radius-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 600;
      color: var(--admin-text-secondary); transition: background .12s, color .12s;
    }
    .wa-link:hover { background: var(--surface-2); color: var(--admin-text); }
    .wa-link--danger { color: var(--status-urgent); }
    .wa-link--danger:hover { background: rgba(240,85,107,0.12); color: var(--status-urgent); }

    /* ── empty state ──────────────────────────────────────────── */
    .wa-empty {
      display: flex; align-items: center; justify-content: center;
      min-height: calc(100vh - 120px);
    }
    .wa-empty-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      max-width: 420px; width: 100%;
      padding: 48px 36px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
    }
    .wa-empty-icon {
      width: 88px; height: 88px; margin-bottom: 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: rgba(76,79,224,0.12); color: var(--brand-primary);
    }
    .wa-empty-title {
      font-family: var(--font-display);
      font-size: 20px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--admin-text); margin: 0 0 8px;
    }
    .wa-empty-sub {
      font-size: 14px; color: var(--admin-text-secondary); line-height: 1.5;
      margin: 0 0 28px; max-width: 320px;
    }

    /* ── connect modal ────────────────────────────────────────── */
    .wa-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      background: rgba(6,8,16,0.66);
      backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
    }
    .wa-modal {
      position: relative;
      width: 480px; max-width: 100%;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 28px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    }
    .wa-modal-close {
      position: absolute; top: 16px; right: 16px;
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; border-radius: var(--radius-sm);
      color: var(--admin-text-muted); cursor: pointer; transition: background .12s, color .12s;
    }
    .wa-modal-close:hover { background: var(--surface-2); color: var(--admin-text); }
    .wa-modal-title {
      font-family: var(--font-display);
      font-size: 19px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--admin-text); margin: 0 0 22px; padding-right: 32px;
    }

    .wa-field { margin-bottom: 22px; }
    .wa-field-label {
      display: block; font-size: 13px; font-weight: 600;
      color: var(--admin-text-body); margin-bottom: 7px;
    }
    .wa-input {
      width: 100%; box-sizing: border-box;
      padding: 11px 13px;
      background: var(--app-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--admin-text);
      font-family: var(--font-mono); font-size: 14px;
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .wa-input::placeholder { color: var(--admin-text-muted); font-family: var(--font-body); }
    .wa-input:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(76,79,224,0.15); }

    .wa-qr { display: flex; justify-content: center; margin-bottom: 16px; }
    .wa-qr-box {
      width: 200px; height: 200px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
      border: 2px dashed rgba(76,79,224,0.5);
      border-radius: var(--radius-lg);
      background: rgba(76,79,224,0.05);
      color: var(--brand-primary);
    }
    .wa-qr-text {
      font-size: 12.5px; font-weight: 500; color: var(--admin-text-muted);
      max-width: 140px; text-align: center;
    }
    .wa-qr-instructions {
      font-size: 13px; color: var(--admin-text-secondary); text-align: center;
      margin: 0 0 24px;
    }

    .wa-modal-actions {
      display: flex; justify-content: flex-end; gap: 10px;
    }

    /* ── responsive ───────────────────────────────────────────── */
    @media (max-width: 767px) {
      .wa-shell { padding: 64px 16px 24px; }
      .wa-head { flex-direction: column; align-items: stretch; }
      .wa-card { flex-wrap: wrap; }
      .wa-actions { width: 100%; justify-content: flex-start; margin-top: 4px; }
      .wa-modal { padding: 22px 18px; }
    }
  `],
})
export class WhatsAppNumbersPage {
  // Show STATE B (list) by default per spec; modal hidden by default.
  readonly showList = signal(true);
  readonly modalOpen = signal(false);
  readonly phoneInput = signal('');

  readonly numbers = signal<WhatsAppNumber[]>([
    { id: 'n1', phone: '+60 12-345 6789', label: 'Support Line', active: true, lastActivity: '2 hours ago' },
    { id: 'n2', phone: '+60 19-876 5432', label: 'Sales Inbox', active: false, lastActivity: '3 days ago' },
  ]);

  openModal(): void { this.modalOpen.set(true); }
  closeModal(): void { this.modalOpen.set(false); }
}
