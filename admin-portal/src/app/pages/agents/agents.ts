import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

interface Agent {
  id: string;
  name: string;
  active: boolean;
  number: string;        // display-formatted, e.g. +60 12-345 6789
  model: string;         // e.g. claude-sonnet-4-6
  conversations: number; // count handled
  systemPrompt: string;  // agent behaviour instructions
}

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
      <div class="ag-shell">

        <!-- ── STATE B: configured agents list ─────────────────────── -->
        @if (showList()) {
          <div class="ag-head">
            <div class="ag-head-text">
              <h1 class="ag-title">Agents</h1>
              <p class="ag-subtitle">Configure your AI agents</p>
            </div>
            <button class="ag-btn ag-btn--primary" (click)="openModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              Create Agent
            </button>
          </div>

          <div class="ag-grid">
            @for (a of agents(); track a.id) {
              <div class="ag-card">
                <div class="ag-card-top">
                  <div class="ag-card-icon" [class.ag-card-icon--off]="!a.active">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" stroke-width="1.8" />
                      <path d="M12 4v4M8 3v2M16 3v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      <circle cx="9" cy="13.5" r="1.4" fill="currentColor" />
                      <circle cx="15" cy="13.5" r="1.4" fill="currentColor" />
                    </svg>
                  </div>
                  <div class="ag-card-heading">
                    <span class="ag-name">{{ a.name }}</span>
                    <span class="ag-badge" [class.ag-badge--on]="a.active" [class.ag-badge--off]="!a.active">
                      <span class="ag-badge-dot"></span>{{ a.active ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>

                <div class="ag-meta">
                  <div class="ag-meta-row">
                    <span class="ag-meta-label">Number</span>
                    <span class="ag-meta-value ag-mono">{{ a.number }}</span>
                  </div>
                  <div class="ag-meta-row">
                    <span class="ag-meta-label">Model</span>
                    <span class="ag-meta-value ag-mono">{{ a.model }}</span>
                  </div>
                  <div class="ag-meta-row">
                    <span class="ag-meta-label">Conversations</span>
                    <span class="ag-meta-value">{{ a.conversations }} conversations</span>
                  </div>
                </div>

                <div class="ag-actions">
                  <button class="ag-btn ag-btn--outline" type="button" (click)="configAgent.set(a)">Configure</button>
                  <button class="ag-link" type="button">{{ a.active ? 'Deactivate' : 'Activate' }}</button>
                  <button class="ag-link ag-link--danger" type="button">Delete</button>
                </div>
              </div>
            }
          </div>
        }

        <!-- ── STATE A: empty ──────────────────────────────────────── -->
        @else {
          <div class="ag-empty">
            <div class="ag-empty-card">
              <div class="ag-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" stroke-width="1.6" />
                  <path d="M12 4v4M8 3v2M16 3v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  <circle cx="9" cy="13.5" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="13.5" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <h2 class="ag-empty-title">No Agents Configured</h2>
              <p class="ag-empty-sub">Create your first AI agent to start handling conversations automatically.</p>
              <button class="ag-btn ag-btn--primary ag-btn--lg" (click)="openModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
                Create Agent
              </button>
            </div>
          </div>
        }

        <!-- ── CREATE AGENT MODAL ──────────────────────────────────── -->
        @if (modalOpen()) {
          <div class="ag-backdrop" (click)="closeModal()">
            <div class="ag-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
                 aria-labelledby="ag-modal-title">
              <button class="ag-modal-close" type="button" (click)="closeModal()" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>

              <h2 id="ag-modal-title" class="ag-modal-title">Create Agent</h2>

              <div class="ag-field">
                <label class="ag-field-label" for="ag-name-input">Agent name</label>
                <input
                  id="ag-name-input"
                  class="ag-input"
                  type="text"
                  [ngModel]="nameInput()"
                  (ngModelChange)="nameInput.set($event)"
                  placeholder="Support Bot" />
              </div>

              <div class="ag-field">
                <label class="ag-field-label" for="ag-number-input">Assigned WhatsApp Number</label>
                <select
                  id="ag-number-input"
                  class="ag-input ag-select"
                  [ngModel]="numberInput()"
                  (ngModelChange)="numberInput.set($event)">
                  <option value="" disabled>Select a number</option>
                  <option value="+60 12-345 6789">+60 12-345 6789</option>
                  <option value="+60 19-876 5432">+60 19-876 5432</option>
                </select>
              </div>

              <div class="ag-field">
                <label class="ag-field-label" for="ag-prompt-input">System prompt</label>
                <textarea
                  id="ag-prompt-input"
                  class="ag-input ag-textarea"
                  rows="4"
                  [ngModel]="promptInput()"
                  (ngModelChange)="promptInput.set($event)"
                  placeholder="You are a helpful support agent for..."></textarea>
              </div>

              <div class="ag-field">
                <label class="ag-field-label" for="ag-model-input">Model</label>
                <select
                  id="ag-model-input"
                  class="ag-input ag-select"
                  [ngModel]="modelInput()"
                  (ngModelChange)="modelInput.set($event)">
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                  <option value="claude-haiku-4-5">claude-haiku-4-5</option>
                </select>
              </div>

              <div class="ag-modal-actions">
                <button class="ag-btn ag-btn--ghost" type="button" (click)="closeModal()">Cancel</button>
                <button class="ag-btn ag-btn--primary" type="button" (click)="createAgent()">Create</button>
              </div>
            </div>
          </div>
        }

        <!-- ── CONFIGURE AGENT DRAWER ───────────────────────────────── -->
        @if (configAgent(); as ca) {
          <div class="ag-drawer-backdrop" (click)="configAgent.set(null)"></div>
          <aside class="ag-drawer" role="dialog" aria-modal="true" aria-labelledby="ag-drawer-title">
            <header class="ag-drawer-head">
              <h2 id="ag-drawer-title">Configure Agent</h2>
              <button class="ag-drawer-close" type="button" (click)="configAgent.set(null)" aria-label="Close">✕</button>
            </header>

            <!-- Name -->
            <div class="ag-drawer-field">
              <label>Agent Name</label>
              <input type="text" [value]="ca.name" class="ag-input" />
            </div>

            <!-- Active toggle -->
            <div class="ag-drawer-field ag-drawer-field--row">
              <label>Active</label>
              <button class="ag-toggle" type="button" [class.ag-toggle--on]="ca.active" (click)="toggleStatus()">
                {{ ca.active ? 'On' : 'Off' }}
              </button>
            </div>

            <!-- System Prompt -->
            <div class="ag-drawer-field">
              <label>System Prompt</label>
              <textarea class="ag-input ag-textarea" rows="8"
                [value]="ca.systemPrompt"
                placeholder="You are a helpful support agent for..."></textarea>
            </div>

            <!-- Model select -->
            <div class="ag-drawer-field">
              <label>Model</label>
              <select class="ag-input ag-select">
                <option value="claude-sonnet-4-6" [selected]="ca.model === 'claude-sonnet-4-6'">claude-sonnet-4-6</option>
                <option value="claude-haiku-4-5" [selected]="ca.model === 'claude-haiku-4-5'">claude-haiku-4-5</option>
              </select>
            </div>

            <!-- WA Number -->
            <div class="ag-drawer-field">
              <label>WhatsApp Number</label>
              <select class="ag-input ag-select">
                <option [selected]="ca.number === '+60 12-345 6789'">+60 12-345 6789 (Support Line)</option>
                <option [selected]="ca.number === '+60 19-876 5432'">+60 19-876 5432 (Sales Line)</option>
              </select>
            </div>

            <!-- Performance stats -->
            <div class="ag-drawer-stats">
              <div class="ag-stat"><span class="ag-stat-val">{{ ca.conversations }}</span><span class="ag-stat-lbl">Conversations</span></div>
              <div class="ag-stat"><span class="ag-stat-val">1m 24s</span><span class="ag-stat-lbl">Avg Response</span></div>
              <div class="ag-stat"><span class="ag-stat-val">94%</span><span class="ag-stat-lbl">Resolution Rate</span></div>
            </div>

            <!-- Save -->
            <div class="ag-drawer-actions">
              <button class="ag-btn ag-btn--primary" type="button" (click)="saveConfig()">Save Changes</button>
              <button class="ag-btn ag-btn--ghost" type="button" (click)="configAgent.set(null)">Cancel</button>
            </div>
          </aside>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    ion-content { --background: var(--app-bg); }

    .ag-shell {
      min-height: 100%;
      padding: 28px 32px;
      background: var(--app-bg);
    }

    /* ── page header ──────────────────────────────────────────── */
    .ag-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 24px;
    }
    .ag-title {
      font-family: var(--font-display);
      font-size: 24px; font-weight: 700; letter-spacing: -0.5px;
      color: var(--admin-text); margin: 0;
    }
    .ag-subtitle {
      font-size: 14px; color: var(--admin-text-secondary); margin: 4px 0 0;
    }

    /* ── buttons ──────────────────────────────────────────────── */
    .ag-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 16px; border-radius: var(--radius-md);
      font-family: var(--font-body); font-size: 14px; font-weight: 600;
      border: 1px solid transparent; cursor: pointer;
      transition: filter .15s, background .15s, border-color .15s;
    }
    .ag-btn--lg { padding: 11px 22px; font-size: 15px; }
    .ag-btn--primary {
      background: var(--brand-primary); color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .ag-btn--primary:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(76,79,224,0.32); }
    .ag-btn--primary:active { filter: brightness(0.96); }
    .ag-btn--ghost {
      background: transparent; color: var(--admin-text-secondary);
      border-color: var(--border);
    }
    .ag-btn--ghost:hover { background: var(--surface-2); color: var(--admin-text); }
    .ag-btn--outline {
      background: transparent; color: var(--brand-primary);
      border-color: rgba(76,79,224,0.5); padding: 7px 14px; font-size: 13px;
    }
    .ag-btn--outline:hover { background: rgba(76,79,224,0.1); border-color: var(--brand-primary); }

    /* ── agent cards grid ─────────────────────────────────────── */
    .ag-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .ag-card {
      display: flex; flex-direction: column;
      padding: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      transition: border-color .15s, box-shadow .15s;
    }
    .ag-card:hover { border-color: rgba(76,79,224,0.4); box-shadow: 0 2px 12px rgba(0,0,0,0.18); }

    .ag-card-top { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
    .ag-card-icon {
      width: 44px; height: 44px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md);
      background: rgba(76,79,224,0.14); color: var(--brand-primary);
    }
    .ag-card-icon--off { background: var(--surface-2); color: var(--admin-text-muted); }

    .ag-card-heading { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ag-name {
      font-family: var(--font-display); font-size: 17px; font-weight: 700;
      letter-spacing: -0.2px; color: var(--admin-text);
    }

    /* ── status badge ─────────────────────────────────────────── */
    .ag-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 10px; border-radius: var(--radius-full);
      font-size: 12px; font-weight: 600; letter-spacing: 0.2px;
    }
    .ag-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .ag-badge--on  { background: rgba(52,211,153,0.14); color: var(--status-live); }
    .ag-badge--off { background: var(--surface-2); color: var(--admin-text-muted); }

    /* ── card meta ────────────────────────────────────────────── */
    .ag-meta {
      display: flex; flex-direction: column; gap: 9px;
      padding: 14px 0; margin-bottom: 4px;
      border-top: 1px solid var(--border);
    }
    .ag-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .ag-meta-label { font-size: 13px; color: var(--admin-text-muted); font-weight: 500; }
    .ag-meta-value { font-size: 13.5px; color: var(--admin-text-body); font-weight: 600; text-align: right; }
    .ag-mono { font-family: var(--font-mono); font-size: 13px; color: var(--admin-text); }

    /* ── row actions ──────────────────────────────────────────── */
    .ag-actions {
      display: flex; align-items: center; gap: 6px;
      padding-top: 14px; border-top: 1px solid var(--border);
    }
    .ag-link {
      background: transparent; border: none; cursor: pointer;
      padding: 6px 10px; border-radius: var(--radius-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 600;
      color: var(--admin-text-secondary); transition: background .12s, color .12s;
    }
    .ag-link:hover { background: var(--surface-2); color: var(--admin-text); }
    .ag-link--danger { color: var(--status-urgent); }
    .ag-link--danger:hover { background: rgba(240,85,107,0.12); color: var(--status-urgent); }

    /* ── empty state ──────────────────────────────────────────── */
    .ag-empty {
      display: flex; align-items: center; justify-content: center;
      min-height: calc(100vh - 120px);
    }
    .ag-empty-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      max-width: 420px; width: 100%;
      padding: 48px 36px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
    }
    .ag-empty-icon {
      width: 88px; height: 88px; margin-bottom: 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: rgba(76,79,224,0.12); color: var(--brand-primary);
    }
    .ag-empty-title {
      font-family: var(--font-display);
      font-size: 20px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--admin-text); margin: 0 0 8px;
    }
    .ag-empty-sub {
      font-size: 14px; color: var(--admin-text-secondary); line-height: 1.5;
      margin: 0 0 28px; max-width: 320px;
    }

    /* ── create modal ─────────────────────────────────────────── */
    .ag-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      background: rgba(6,8,16,0.66);
      backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
    }
    .ag-modal {
      position: relative;
      width: 480px; max-width: 100%;
      max-height: calc(100vh - 48px); overflow-y: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 28px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    }
    .ag-modal-close {
      position: absolute; top: 16px; right: 16px;
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; border-radius: var(--radius-sm);
      color: var(--admin-text-muted); cursor: pointer; transition: background .12s, color .12s;
    }
    .ag-modal-close:hover { background: var(--surface-2); color: var(--admin-text); }
    .ag-modal-title {
      font-family: var(--font-display);
      font-size: 19px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--admin-text); margin: 0 0 22px; padding-right: 32px;
    }

    .ag-field { margin-bottom: 20px; }
    .ag-field-label {
      display: block; font-size: 13px; font-weight: 600;
      color: var(--admin-text-body); margin-bottom: 7px;
    }
    .ag-input {
      width: 100%; box-sizing: border-box;
      padding: 11px 13px;
      background: var(--app-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--admin-text);
      font-family: var(--font-body); font-size: 14px;
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .ag-input::placeholder { color: var(--admin-text-muted); }
    .ag-input:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(76,79,224,0.15); }
    .ag-select { cursor: pointer; appearance: none; -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 12px center; padding-right: 38px;
    }
    .ag-textarea { resize: vertical; min-height: 92px; line-height: 1.5; font-family: var(--font-body); }

    .ag-modal-actions {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;
    }

    /* ── configure drawer ─────────────────────────────────────── */
    .ag-drawer-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(6,8,16,0.66);
      backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
    }
    .ag-drawer {
      position: fixed; top: 0; right: 0; z-index: 1001;
      width: 480px; max-width: 100%; height: 100vh;
      background: var(--surface); border-left: 1px solid var(--border);
      overflow-y: auto; padding: 24px;
      display: flex; flex-direction: column; gap: 16px;
      box-shadow: -24px 0 60px rgba(0,0,0,0.5);
      animation: ag-slide-in .2s ease;
    }
    @keyframes ag-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .ag-drawer-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .ag-drawer-head h2 {
      font-family: var(--font-display); font-size: 19px; font-weight: 700;
      letter-spacing: -0.3px; color: var(--admin-text); margin: 0;
    }
    .ag-drawer-close {
      background: none; border: none; color: var(--admin-text-secondary);
      font-size: 18px; line-height: 1; cursor: pointer; padding: 4px 8px;
      border-radius: var(--radius-sm); transition: background .12s, color .12s;
    }
    .ag-drawer-close:hover { background: var(--surface-2); color: var(--admin-text); }
    .ag-drawer-field { display: flex; flex-direction: column; gap: 6px; }
    .ag-drawer-field label {
      font-size: 12px; font-weight: 600; color: var(--admin-text-secondary);
      text-transform: uppercase; letter-spacing: .5px;
    }
    .ag-drawer-field--row { flex-direction: row; justify-content: space-between; align-items: center; }
    .ag-drawer .ag-textarea { resize: vertical; font-family: var(--font-mono); font-size: 13px; min-height: 140px; }
    .ag-toggle {
      padding: 5px 18px; border-radius: var(--radius-full);
      border: 1px solid var(--border); cursor: pointer;
      background: var(--surface-2); color: var(--admin-text-secondary);
      font-family: var(--font-body); font-size: 13px; font-weight: 600;
      transition: background .15s, color .15s, border-color .15s;
    }
    .ag-toggle--on { background: var(--ec-teal-400); border-color: var(--ec-teal-400); color: #06121A; }
    .ag-drawer-stats {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
      padding: 16px; background: var(--app-bg); border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .ag-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
    .ag-stat-val { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--admin-text); }
    .ag-stat-lbl { font-size: 11px; color: var(--admin-text-secondary); }
    .ag-drawer-actions { display: flex; gap: 10px; margin-top: auto; padding-top: 8px; }

    /* ── responsive ───────────────────────────────────────────── */
    @media (max-width: 767px) {
      .ag-shell { padding: 64px 16px 24px; }
      .ag-head { flex-direction: column; align-items: stretch; }
      .ag-grid { grid-template-columns: minmax(0, 1fr); }
      .ag-actions { flex-wrap: wrap; }
      .ag-modal { padding: 22px 18px; }
      .ag-drawer { width: 100%; }
    }
  `],
})
export class AgentsPage {
  private readonly toast = inject(ToastService);

  // Show STATE B (list) by default per spec; modal hidden by default.
  readonly showList = signal(true);
  readonly modalOpen = signal(false);

  // which agent is being configured (null = drawer closed)
  readonly configAgent = signal<Agent | null>(null);

  // create-form fields
  readonly nameInput = signal('');
  readonly numberInput = signal('');
  readonly promptInput = signal('');
  readonly modelInput = signal('claude-sonnet-4-6');

  readonly agents = signal<Agent[]>([
    { id: 'a1', name: 'Support Bot', active: true, number: '+60 12-345 6789', model: 'claude-sonnet-4-6', conversations: 142,
      systemPrompt: 'You are a helpful support agent for Echora. Answer customer questions clearly, escalate billing disputes to a human, and always confirm resolution before closing a conversation.' },
    { id: 'a2', name: 'Sales Assistant', active: false, number: '+60 19-876 5432', model: 'claude-haiku-4-5', conversations: 37,
      systemPrompt: 'You are a friendly sales assistant. Qualify leads, share pricing tiers, and book demos. Keep replies concise and action-oriented.' },
  ]);

  openModal(): void { this.modalOpen.set(true); }
  closeModal(): void { this.modalOpen.set(false); }

  createAgent(): void {
    this.closeModal();
    this.toast.show('Agent created', 'success');
  }

  /** Flip the active flag on the agent currently open in the drawer. */
  toggleStatus(): void {
    const ca = this.configAgent();
    if (!ca) return;
    const next = { ...ca, active: !ca.active };
    this.configAgent.set(next);
    this.agents.update((list) => list.map((a) => (a.id === next.id ? next : a)));
  }

  /** Persist drawer edits (mock), confirm via toast, then close. */
  saveConfig(): void {
    this.toast.show('Agent configuration saved', 'success');
    this.configAgent.set(null);
  }
}
