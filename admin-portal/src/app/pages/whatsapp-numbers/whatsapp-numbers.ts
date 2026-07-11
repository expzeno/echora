import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { WhatsAppNumberService, WhatsappNumber as ApiWhatsappNumber } from '../../services/whatsapp-number.service';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

interface WhatsAppNumber {
  id: string;
  phone: string;        // phoneNumber from backend
  label: string;        // displayName from backend
  active: boolean;      // isActive from backend
  businessAccountId: string; // wabaId from backend
  lastActivity: string; // human string derived from updatedAt
}

@Component({
  selector: 'app-whatsapp-numbers',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
      <div class="wa-shell">

        <!-- ── STATE: loading ──────────────────────────────────────── -->
        @if (loading()) {
          <div class="wa-head">
            <div class="wa-head-text">
              <h1 class="wa-title">WhatsApp Numbers</h1>
              <p class="wa-subtitle">Manage your connected inboxes</p>
            </div>
          </div>
          <div class="wa-list">
            @for (s of [1,2,3]; track s) {
              <div class="wa-card wa-card--skeleton">
                <div class="wa-sk wa-sk--icon"></div>
                <div class="wa-card-body">
                  <div class="wa-sk wa-sk--line" style="width:55%"></div>
                  <div class="wa-sk wa-sk--line" style="width:75%"></div>
                </div>
              </div>
            }
          </div>
        }

        <!-- ── STATE: error ────────────────────────────────────────── -->
        @else if (error()) {
          <div class="wa-empty">
            <div class="wa-empty-card">
              <div class="wa-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
                  <path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </div>
              <h2 class="wa-empty-title">Couldn’t load numbers</h2>
              <p class="wa-empty-sub">Something went wrong reaching the server. Please try again.</p>
              <button class="wa-btn wa-btn--primary wa-btn--lg" (click)="loadNumbers()">Retry</button>
            </div>
          </div>
        }

        <!-- ── STATE B: connected numbers list ─────────────────────── -->
        @else if (showList()) {
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
                  @if (n.businessAccountId) {
                    <div class="wa-card-row wa-card-meta">
                      <span class="wa-label">Business Account ID</span>
                      <span class="wa-dot-sep">•</span>
                      <span class="wa-activity wa-mono">{{ n.businessAccountId }}</span>
                    </div>
                  }
                </div>

                <div class="wa-actions">
                  <button class="wa-link" type="button" (click)="startRename(n)">Rename</button>
                  <button class="wa-link" type="button" (click)="toggleActive(n)">{{ n.active ? 'Deactivate' : 'Activate' }}</button>
                  <button class="wa-link wa-link--danger" type="button" (click)="pendingDelete.set(n)">Delete</button>
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

              <div class="wa-field">
                <label class="wa-field-label" for="wa-label-input">Inbox label</label>
                <input
                  id="wa-label-input"
                  class="wa-input wa-input--text"
                  type="text"
                  [ngModel]="labelInput()"
                  (ngModelChange)="labelInput.set($event)"
                  placeholder="e.g. Support Line" />
              </div>

              <div class="wa-field">
                <label class="wa-field-label" for="wa-waba-input">Business Account ID</label>
                <input
                  id="wa-waba-input"
                  class="wa-input wa-input--text"
                  type="text"
                  [ngModel]="wabaInput()"
                  (ngModelChange)="wabaInput.set($event)"
                  placeholder="Optional — WhatsApp Business Account ID" />
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
                <button class="wa-btn wa-btn--primary" type="button" (click)="connectNumber()">Connect</button>
              </div>
            </div>
          </div>
        }

        <!-- ── RENAME MODAL ────────────────────────────────────────── -->
        @if (renameTarget(); as rt) {
          <div class="wa-backdrop" (click)="cancelRename()">
            <div class="wa-modal wa-modal--sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
                 aria-labelledby="wa-rename-title">
              <button class="wa-modal-close" type="button" (click)="cancelRename()" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>
              <h2 id="wa-rename-title" class="wa-modal-title">Rename Inbox</h2>
              <div class="wa-field">
                <label class="wa-field-label" for="wa-rename-input">Label</label>
                <input
                  id="wa-rename-input"
                  class="wa-input wa-input--text"
                  type="text"
                  [ngModel]="renameInput()"
                  (ngModelChange)="renameInput.set($event)"
                  (keyup.enter)="saveRename()"
                  placeholder="e.g. Support Line" />
              </div>
              <div class="wa-modal-actions">
                <button class="wa-btn wa-btn--ghost" type="button" (click)="cancelRename()">Cancel</button>
                <button class="wa-btn wa-btn--primary" type="button" [disabled]="!renameInput().trim()"
                        (click)="saveRename()">Save</button>
              </div>
            </div>
          </div>
        }

        <!-- ── DELETE CONFIRM ──────────────────────────────────────── -->
        @if (pendingDelete(); as pd) {
          <div class="wa-backdrop" (click)="pendingDelete.set(null)">
            <div class="wa-modal wa-modal--sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
                 aria-labelledby="wa-del-title">
              <h2 id="wa-del-title" class="wa-modal-title">Remove number?</h2>
              <p class="wa-confirm-text">
                <strong>{{ pd.phone }}</strong> ({{ pd.label }}) will be disconnected and its inbox removed. This can’t be undone.
              </p>
              <div class="wa-modal-actions">
                <button class="wa-btn wa-btn--ghost" type="button" (click)="pendingDelete.set(null)">Cancel</button>
                <button class="wa-btn wa-btn--danger" type="button" (click)="deleteNumber(pd)">Remove Number</button>
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

    .wa-mono { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; }

    /* ── skeleton loading ─────────────────────────────────────── */
    .wa-card--skeleton { pointer-events: none; }
    .wa-sk {
      background: linear-gradient(90deg,
        var(--admin-border) 25%, rgba(255,255,255,0.04) 37%, var(--admin-border) 63%);
      background-size: 400% 100%;
      animation: wa-shimmer 1.4s ease infinite;
      border-radius: 6px;
    }
    .wa-sk--icon { width: 40px; height: 40px; border-radius: 12px; flex: none; }
    .wa-sk--line { height: 12px; margin: 8px 0; }
    @keyframes wa-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

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
    .wa-btn:disabled { opacity: .5; cursor: not-allowed; filter: none; box-shadow: none; }
    .wa-modal--sm { width: 420px; }
    .wa-input--text { font-family: var(--font-body); }
    .wa-confirm-text {
      font-size: 14px; line-height: 1.55; color: var(--admin-text-secondary);
      margin: 0 0 22px;
    }
    .wa-confirm-text strong { color: var(--admin-text); font-weight: 600; font-family: var(--font-mono); }
    .wa-btn--danger {
      background: var(--status-urgent); color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .wa-btn--danger:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(240,85,107,0.3); }
    .wa-btn--danger:active { filter: brightness(0.96); }

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
export class WhatsAppNumbersPage implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly api = inject(WhatsAppNumberService);

  readonly showList = signal(false);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly modalOpen = signal(false);

  // connect-form fields
  readonly phoneInput = signal('');
  readonly labelInput = signal('');
  readonly wabaInput = signal('');

  // rename modal target + draft label
  readonly renameTarget = signal<WhatsAppNumber | null>(null);
  readonly renameInput = signal('');

  // number queued for deletion (null = confirm modal closed)
  readonly pendingDelete = signal<WhatsAppNumber | null>(null);

  readonly numbers = signal<WhatsAppNumber[]>([]);

  ngOnInit(): void {
    this.loadNumbers();
  }

  /** Map an API whatsapp number into the local card view model. */
  private toView(n: ApiWhatsappNumber): WhatsAppNumber {
    return {
      id: n.id,
      phone: n.phoneNumber,
      label: n.displayName,
      active: n.isActive,
      businessAccountId: n.wabaId || '',
      lastActivity: this.relativeTime(n.updatedAt),
    };
  }

  /** Human-friendly relative time from an ISO string. */
  private relativeTime(iso?: string): string {
    if (!iso) return 'just now';
    const then = new Date(iso).getTime();
    if (isNaN(then)) return 'just now';
    const diff = Math.max(0, Date.now() - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  /** Fetch the connected numbers from the API. */
  loadNumbers(): void {
    this.error.set(false);
    this.loading.set(true);
    this.api.getNumbers().subscribe({
      next: (rows) => {
        const mapped = rows.map((n) => this.toView(n));
        this.numbers.set(mapped);
        this.showList.set(mapped.length > 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  openModal(): void {
    this.phoneInput.set('');
    this.labelInput.set('');
    this.wabaInput.set('');
    this.modalOpen.set(true);
  }
  closeModal(): void { this.modalOpen.set(false); }

  connectNumber(): void {
    const phone = this.phoneInput().trim();
    const label = this.labelInput().trim();
    if (!phone) { this.toast.show('Phone number is required', 'error'); return; }
    if (!label) { this.toast.show('Inbox label is required', 'error'); return; }

    const waba = this.wabaInput().trim();
    this.api.createNumber({
      phoneNumber: phone,
      displayName: label,
      ...(waba ? { wabaId: waba } : {}),
    }).subscribe({
      next: (created) => {
        this.numbers.update((list) => [this.toView(created), ...list]);
        this.showList.set(true);
        this.closeModal();
        this.toast.show('Number connected', 'success');
      },
      error: (e) => this.toast.show(e?.message || 'Could not connect number', 'error'),
    });
  }

  /** Flip active state from the list card + confirm via toast. */
  toggleActive(n: WhatsAppNumber): void {
    this.api.toggleNumber(n.id).subscribe({
      next: (updated) => {
        this.numbers.update((list) =>
          list.map((x) => (x.id === n.id ? { ...x, active: updated.isActive } : x)));
        this.toast.show(updated.isActive ? `${n.label} activated` : `${n.label} deactivated`, 'success');
      },
      error: (e) => this.toast.show(e?.message || 'Could not update number', 'error'),
    });
  }

  /** Open the rename modal pre-filled with the current label. */
  startRename(n: WhatsAppNumber): void {
    this.renameInput.set(n.label);
    this.renameTarget.set(n);
  }
  cancelRename(): void { this.renameTarget.set(null); }

  saveRename(): void {
    const target = this.renameTarget();
    const label = this.renameInput().trim();
    if (!target || !label) return;
    this.api.updateNumber(target.id, { displayName: label }).subscribe({
      next: (updated) => {
        this.numbers.update((list) =>
          list.map((x) => (x.id === target.id ? { ...x, label: updated.displayName } : x)));
        this.renameTarget.set(null);
        this.toast.show('Inbox renamed', 'success');
      },
      error: (e) => this.toast.show(e?.message || 'Could not rename inbox', 'error'),
    });
  }

  /** Remove the number queued in pendingDelete, toast, and close the confirm. */
  deleteNumber(n: WhatsAppNumber): void {
    this.api.deleteNumber(n.id).subscribe({
      next: () => {
        this.numbers.update((list) => list.filter((x) => x.id !== n.id));
        this.pendingDelete.set(null);
        this.showList.set(this.numbers().length > 0);
        this.toast.show('Number removed', 'success');
      },
      error: (e) => this.toast.show(e?.message || 'Could not remove number', 'error'),
    });
  }
}
