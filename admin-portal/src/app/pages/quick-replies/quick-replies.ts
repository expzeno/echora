import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { ToastService } from '../../services/toast.service';
import { QuickReplyService, QuickReply } from '../../services/quick-reply.service';

@Component({
  selector: 'app-quick-replies',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
      <div class="qr-shell">

        <!-- ── STATE: loading ──────────────────────────────────────── -->
        @if (loading()) {
          <div class="qr-head">
            <div class="qr-head-text">
              <h1 class="qr-title">Quick Replies</h1>
              <p class="qr-subtitle">Canned responses your team can send in one tap</p>
            </div>
          </div>
          <div class="qr-list">
            @for (s of [1,2,3]; track s) {
              <div class="qr-card qr-card--skeleton">
                <div class="qr-sk qr-sk--line" style="width:38%"></div>
                <div class="qr-sk qr-sk--line" style="width:82%"></div>
                <div class="qr-sk qr-sk--line" style="width:64%"></div>
              </div>
            }
          </div>
        }

        <!-- ── STATE: error ────────────────────────────────────────── -->
        @else if (error()) {
          <div class="qr-empty">
            <div class="qr-empty-card">
              <div class="qr-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
                  <path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </div>
              <h2 class="qr-empty-title">Couldn’t load quick replies</h2>
              <p class="qr-empty-sub">Something went wrong reaching the server. Please try again.</p>
              <button class="qr-btn qr-btn--primary qr-btn--lg" (click)="loadReplies()">Retry</button>
            </div>
          </div>
        }

        <!-- ── STATE B: list ───────────────────────────────────────── -->
        @else if (showList()) {
          <div class="qr-head">
            <div class="qr-head-text">
              <h1 class="qr-title">Quick Replies</h1>
              <p class="qr-subtitle">Canned responses your team can send in one tap</p>
            </div>
            <button class="qr-btn qr-btn--primary" (click)="openModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              Add Reply
            </button>
          </div>

          <div class="qr-list">
            @for (r of replies(); track r.id) {
              <div class="qr-card">
                <div class="qr-card-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h7l-1 8 11-12h-7l1-8z" stroke="currentColor" stroke-width="1.6"
                          stroke-linejoin="round" />
                  </svg>
                </div>
                <div class="qr-card-body">
                  <span class="qr-card-title">{{ r.title }}</span>
                  <p class="qr-card-preview">{{ r.body }}</p>
                </div>
                <button class="qr-icon-btn qr-icon-btn--danger" type="button"
                        (click)="pendingDelete.set(r)" aria-label="Delete quick reply">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7"
                          stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            }
          </div>
        }

        <!-- ── STATE A: empty ──────────────────────────────────────── -->
        @else {
          <div class="qr-empty">
            <div class="qr-empty-card">
              <div class="qr-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M13 2L3 14h7l-1 8 11-12h-7l1-8z" stroke="currentColor" stroke-width="1.5"
                        stroke-linejoin="round" />
                </svg>
              </div>
              <h2 class="qr-empty-title">No quick replies yet</h2>
              <p class="qr-empty-sub">Add your first one to send common responses to customers in a single tap.</p>
              <button class="qr-btn qr-btn--primary qr-btn--lg" (click)="openModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
                Add Reply
              </button>
            </div>
          </div>
        }

        <!-- ── ADD REPLY MODAL ─────────────────────────────────────── -->
        @if (modalOpen()) {
          <div class="qr-backdrop" (click)="closeModal()">
            <div class="qr-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
                 aria-labelledby="qr-modal-title">
              <button class="qr-modal-close" type="button" (click)="closeModal()" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>

              <h2 id="qr-modal-title" class="qr-modal-title">Add Quick Reply</h2>

              <div class="qr-field">
                <label class="qr-field-label" for="qr-title-input">Title</label>
                <input
                  id="qr-title-input"
                  class="qr-input"
                  type="text"
                  [ngModel]="titleInput()"
                  (ngModelChange)="titleInput.set($event)"
                  placeholder="Greeting" />
              </div>

              <div class="qr-field">
                <label class="qr-field-label" for="qr-body-input">Message</label>
                <textarea
                  id="qr-body-input"
                  class="qr-input qr-textarea"
                  rows="5"
                  [ngModel]="bodyInput()"
                  (ngModelChange)="bodyInput.set($event)"
                  placeholder="Hi! Thanks for reaching out — how can we help you today?"></textarea>
              </div>

              <div class="qr-modal-actions">
                <button class="qr-btn qr-btn--ghost" type="button" (click)="closeModal()">Cancel</button>
                <button class="qr-btn qr-btn--primary" type="button" [disabled]="saving()"
                        (click)="createReply()">{{ saving() ? 'Saving…' : 'Save' }}</button>
              </div>
            </div>
          </div>
        }

        <!-- ── DELETE CONFIRM ──────────────────────────────────────── -->
        @if (pendingDelete(); as pd) {
          <div class="qr-backdrop" (click)="pendingDelete.set(null)">
            <div class="qr-modal qr-modal--sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
                 aria-labelledby="qr-del-title">
              <h2 id="qr-del-title" class="qr-modal-title">Delete quick reply?</h2>
              <p class="qr-confirm-text">
                <strong>{{ pd.title }}</strong> will be permanently removed. This can’t be undone.
              </p>
              <div class="qr-modal-actions">
                <button class="qr-btn qr-btn--ghost" type="button" (click)="pendingDelete.set(null)">Cancel</button>
                <button class="qr-btn qr-btn--danger" type="button" (click)="deleteReply(pd)">Delete</button>
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

    .qr-shell {
      min-height: 100%;
      padding: 28px 32px;
      background: var(--app-bg);
    }

    /* ── page header ──────────────────────────────────────────── */
    .qr-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 24px;
    }
    .qr-title {
      font-family: var(--font-display);
      font-size: 24px; font-weight: 700; letter-spacing: -0.5px;
      color: var(--admin-text); margin: 0;
    }
    .qr-subtitle {
      font-size: 14px; color: var(--admin-text-secondary); margin: 4px 0 0;
    }

    /* ── skeleton loading ─────────────────────────────────────── */
    .qr-card--skeleton { pointer-events: none; display: block; }
    .qr-sk {
      background: linear-gradient(90deg,
        var(--admin-border) 25%, rgba(255,255,255,0.04) 37%, var(--admin-border) 63%);
      background-size: 400% 100%;
      animation: qr-shimmer 1.4s ease infinite;
      border-radius: 6px;
    }
    .qr-sk--line { height: 12px; margin: 10px 0; }
    @keyframes qr-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

    /* ── buttons ──────────────────────────────────────────────── */
    .qr-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 16px; border-radius: var(--radius-md);
      font-family: var(--font-body); font-size: 14px; font-weight: 600;
      border: 1px solid transparent; cursor: pointer;
      transition: filter .15s, background .15s, border-color .15s;
    }
    .qr-btn--lg { padding: 11px 22px; font-size: 15px; }
    .qr-btn--primary {
      background: var(--brand-primary); color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .qr-btn--primary:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(76,79,224,0.32); }
    .qr-btn--primary:active { filter: brightness(0.96); }
    .qr-btn--primary:disabled { opacity: .6; cursor: default; filter: none; box-shadow: none; }
    .qr-btn--ghost {
      background: transparent; color: var(--admin-text-secondary);
      border-color: var(--border);
    }
    .qr-btn--ghost:hover { background: var(--surface-2); color: var(--admin-text); }
    .qr-btn--danger {
      background: var(--status-urgent); color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .qr-btn--danger:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(240,85,107,0.3); }
    .qr-btn--danger:active { filter: brightness(0.96); }

    /* ── replies list ─────────────────────────────────────────── */
    .qr-list { display: flex; flex-direction: column; gap: 12px; }
    .qr-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      transition: border-color .15s, box-shadow .15s;
    }
    .qr-card:hover { border-color: rgba(76,79,224,0.4); box-shadow: 0 2px 12px rgba(0,0,0,0.18); }
    .qr-card-icon {
      width: 38px; height: 38px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md);
      background: rgba(34,200,192,0.14); color: var(--ec-teal-400);
    }
    .qr-card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .qr-card-title {
      font-family: var(--font-display); font-size: 15px; font-weight: 700;
      letter-spacing: -0.2px; color: var(--admin-text);
    }
    .qr-card-preview {
      font-size: 13.5px; line-height: 1.5; color: var(--admin-text-secondary);
      margin: 0;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .qr-icon-btn {
      flex-shrink: 0;
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; border-radius: var(--radius-sm);
      color: var(--admin-text-muted); cursor: pointer;
      transition: background .12s, color .12s;
    }
    .qr-icon-btn--danger:hover { background: rgba(240,85,107,0.12); color: var(--status-urgent); }

    /* ── empty state ──────────────────────────────────────────── */
    .qr-empty {
      display: flex; align-items: center; justify-content: center;
      min-height: calc(100vh - 120px);
    }
    .qr-empty-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      max-width: 420px; width: 100%;
      padding: 48px 36px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
    }
    .qr-empty-icon {
      width: 88px; height: 88px; margin-bottom: 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: rgba(34,200,192,0.12); color: var(--ec-teal-400);
    }
    .qr-empty-title {
      font-family: var(--font-display);
      font-size: 20px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--admin-text); margin: 0 0 8px;
    }
    .qr-empty-sub {
      font-size: 14px; color: var(--admin-text-secondary); line-height: 1.5;
      margin: 0 0 28px; max-width: 320px;
    }

    /* ── modal ────────────────────────────────────────────────── */
    .qr-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      background: rgba(6,8,16,0.66);
      backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
    }
    .qr-modal {
      position: relative;
      width: 480px; max-width: 100%;
      max-height: calc(100vh - 48px); overflow-y: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 28px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    }
    .qr-modal--sm { width: 420px; }
    .qr-modal-close {
      position: absolute; top: 16px; right: 16px;
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; border-radius: var(--radius-sm);
      color: var(--admin-text-muted); cursor: pointer; transition: background .12s, color .12s;
    }
    .qr-modal-close:hover { background: var(--surface-2); color: var(--admin-text); }
    .qr-modal-title {
      font-family: var(--font-display);
      font-size: 19px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--admin-text); margin: 0 0 22px; padding-right: 32px;
    }
    .qr-confirm-text {
      font-size: 14px; line-height: 1.55; color: var(--admin-text-secondary);
      margin: 0 0 22px;
    }
    .qr-confirm-text strong { color: var(--admin-text); font-weight: 600; }

    .qr-field { margin-bottom: 20px; }
    .qr-field-label {
      display: block; font-size: 13px; font-weight: 600;
      color: var(--admin-text-body); margin-bottom: 7px;
    }
    .qr-input {
      width: 100%; box-sizing: border-box;
      padding: 11px 13px;
      background: var(--app-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--admin-text);
      font-family: var(--font-body); font-size: 14px;
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .qr-input::placeholder { color: var(--admin-text-muted); }
    .qr-input:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(76,79,224,0.15); }
    .qr-textarea { resize: vertical; min-height: 110px; line-height: 1.5; font-family: var(--font-body); }

    .qr-modal-actions {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;
    }

    /* ── responsive ───────────────────────────────────────────── */
    @media (max-width: 767px) {
      .qr-shell { padding: 64px 16px 24px; }
      .qr-head { flex-direction: column; align-items: stretch; }
      .qr-modal { padding: 22px 18px; }
    }
  `],
})
export class QuickRepliesPage implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly api = inject(QuickReplyService);

  readonly showList = signal(false);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);

  readonly pendingDelete = signal<QuickReply | null>(null);

  // add-form fields
  readonly titleInput = signal('');
  readonly bodyInput = signal('');

  readonly replies = signal<QuickReply[]>([]);

  ngOnInit(): void {
    this.loadReplies();
  }

  /** Fetch the quick-reply list from the API. */
  loadReplies(): void {
    this.error.set(false);
    this.loading.set(true);
    this.api.getQuickReplies().subscribe({
      next: (rows) => {
        this.replies.set(rows);
        this.showList.set(rows.length > 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  openModal(): void {
    this.titleInput.set('');
    this.bodyInput.set('');
    this.modalOpen.set(true);
  }
  closeModal(): void { this.modalOpen.set(false); }

  createReply(): void {
    const title = this.titleInput().trim();
    const body = this.bodyInput().trim();
    if (!title) { this.toast.show('Title is required', 'error'); return; }
    if (!body) { this.toast.show('Message is required', 'error'); return; }

    this.saving.set(true);
    this.api.createQuickReply(title, body).subscribe({
      next: (created) => {
        this.replies.update((list) => [created, ...list]);
        this.showList.set(true);
        this.saving.set(false);
        this.closeModal();
        this.toast.show('Quick reply added', 'success');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.show(e?.message || 'Could not add quick reply', 'error');
      },
    });
  }

  deleteReply(r: QuickReply): void {
    this.api.deleteQuickReply(r.id).subscribe({
      next: () => {
        this.replies.update((list) => list.filter((x) => x.id !== r.id));
        this.pendingDelete.set(null);
        this.showList.set(this.replies().length > 0);
        this.toast.show(`${r.title} deleted`, 'success');
      },
      error: (e) => this.toast.show(e?.message || 'Could not delete quick reply', 'error'),
    });
  }
}
