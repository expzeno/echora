import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { AgentService, Agent as ApiAgent } from '../../services/agent.service';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

interface Agent {
  id: string;
  name: string;
  active: boolean;
  role: string;          // agent | lead | admin (persisted)
  status: string;        // active | suspended (persisted)
  number: string;        // display-only — no backend field yet
  model: string;         // UI-only until backend adds it
  conversations: number; // UI-only until backend adds it
  systemPrompt: string;  // UI-only agent behaviour instructions
}

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
      <div class="ag-shell">

        <!-- ── STATE: loading ──────────────────────────────────────── -->
        @if (loading()) {
          <div class="ag-head">
            <div class="ag-head-text">
              <h1 class="ag-title">Agents</h1>
              <p class="ag-subtitle">Configure your AI agents</p>
            </div>
          </div>
          <div class="ag-grid">
            @for (s of [1,2,3]; track s) {
              <div class="ag-card ag-card--skeleton">
                <div class="ag-sk ag-sk--icon"></div>
                <div class="ag-sk ag-sk--line" style="width:60%"></div>
                <div class="ag-sk ag-sk--line" style="width:80%"></div>
                <div class="ag-sk ag-sk--line" style="width:45%"></div>
              </div>
            }
          </div>
        }

        <!-- ── STATE: error ────────────────────────────────────────── -->
        @else if (error()) {
          <div class="ag-empty">
            <div class="ag-empty-card">
              <div class="ag-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
                  <path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </div>
              <h2 class="ag-empty-title">Couldn’t load agents</h2>
              <p class="ag-empty-sub">Something went wrong reaching the server. Please try again.</p>
              <button class="ag-btn ag-btn--primary ag-btn--lg" (click)="loadAgents()">Retry</button>
            </div>
          </div>
        }

        <!-- ── STATE B: configured agents list ─────────────────────── -->
        @else if (showList()) {
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
                  <button class="ag-btn ag-btn--outline" type="button" (click)="openConfig(a)">Configure</button>
                  <button class="ag-link" type="button" (click)="toggleActive(a)">{{ a.active ? 'Deactivate' : 'Activate' }}</button>
                  <button class="ag-link ag-link--danger" type="button" (click)="pendingDelete.set(a)">Delete</button>
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
                <label class="ag-field-label" for="ag-email-input">Agent email</label>
                <input
                  id="ag-email-input"
                  class="ag-input"
                  type="email"
                  [ngModel]="emailInput()"
                  (ngModelChange)="emailInput.set($event)"
                  placeholder="support@echora.app" />
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

        <!-- ── DELETE CONFIRM ───────────────────────────────────────── -->
        @if (pendingDelete(); as pd) {
          <div class="ag-backdrop" (click)="pendingDelete.set(null)">
            <div class="ag-modal ag-modal--sm" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
                 aria-labelledby="ag-del-title">
              <h2 id="ag-del-title" class="ag-modal-title">Delete agent?</h2>
              <p class="ag-confirm-text">
                <strong>{{ pd.name }}</strong> and its configuration will be permanently removed. This can’t be undone.
              </p>
              <div class="ag-modal-actions">
                <button class="ag-btn ag-btn--ghost" type="button" (click)="pendingDelete.set(null)">Cancel</button>
                <button class="ag-btn ag-btn--danger" type="button" (click)="deleteAgent(pd)">Delete Agent</button>
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
              <input type="text" class="ag-input"
                [ngModel]="configName()" (ngModelChange)="configName.set($event)" />
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
                [ngModel]="configPrompt()" (ngModelChange)="configPrompt.set($event)"
                placeholder="You are a helpful support agent for..."></textarea>
            </div>

            <!-- Model select -->
            <div class="ag-drawer-field">
              <label>Model</label>
              <select class="ag-input ag-select"
                [ngModel]="configModel()" (ngModelChange)="configModel.set($event)">
                <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                <option value="claude-haiku-4-5">claude-haiku-4-5</option>
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

    /* ── skeleton loading ─────────────────────────────────────── */
    .ag-card--skeleton { pointer-events: none; }
    .ag-sk {
      background: linear-gradient(90deg,
        var(--admin-border) 25%, rgba(255,255,255,0.04) 37%, var(--admin-border) 63%);
      background-size: 400% 100%;
      animation: ag-shimmer 1.4s ease infinite;
      border-radius: 6px;
    }
    .ag-sk--icon { width: 44px; height: 44px; border-radius: 12px; margin-bottom: 16px; }
    .ag-sk--line { height: 12px; margin: 10px 0; }
    @keyframes ag-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

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
    .ag-modal--sm { width: 420px; }
    .ag-confirm-text {
      font-size: 14px; line-height: 1.55; color: var(--admin-text-secondary);
      margin: 0 0 22px;
    }
    .ag-confirm-text strong { color: var(--admin-text); font-weight: 600; }
    .ag-btn--danger {
      background: var(--status-urgent); color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .ag-btn--danger:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(240,85,107,0.3); }
    .ag-btn--danger:active { filter: brightness(0.96); }

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
export class AgentsPage implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly api = inject(AgentService);

  // list is shown once data loads and there is at least one agent.
  readonly showList = signal(false);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly modalOpen = signal(false);

  // which agent is being configured (null = drawer closed)
  readonly configAgent = signal<Agent | null>(null);
  // editable drafts of the configured agent's fields (drawer)
  readonly configName = signal('');
  readonly configPrompt = signal('');
  readonly configModel = signal('claude-sonnet-4-6');

  // agent queued for deletion (null = confirm modal closed)
  readonly pendingDelete = signal<Agent | null>(null);

  // create-form fields
  readonly nameInput = signal('');
  readonly emailInput = signal('');
  readonly numberInput = signal('');
  readonly promptInput = signal('');
  readonly modelInput = signal('claude-sonnet-4-6');

  readonly agents = signal<Agent[]>([]);

  ngOnInit(): void {
    this.loadAgents();
  }

  /** Map an API agent into the local card view model. */
  private toView(a: ApiAgent): Agent {
    return {
      id: a.id,
      name: a.displayName,
      active: a.isActive,
      role: a.role,
      status: a.status,
      number: '—',                         // no WA linkage in backend yet
      model: a.model || 'claude-sonnet-4-6',
      conversations: 0,                    // UI-only until backend exposes it
      systemPrompt: a.systemPrompt || '',
    };
  }

  /** Fetch the agent list from the API. */
  loadAgents(): void {
    this.error.set(false);
    this.loading.set(true);
    this.api.getAgents().subscribe({
      next: (rows) => {
        const mapped = rows.map((a) => this.toView(a));
        this.agents.set(mapped);
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
    this.nameInput.set('');
    this.emailInput.set('');
    this.numberInput.set('');
    this.promptInput.set('');
    this.modelInput.set('claude-sonnet-4-6');
    this.modalOpen.set(true);
  }
  closeModal(): void { this.modalOpen.set(false); }

  /** Open the configure drawer and seed the editable drafts. */
  openConfig(a: Agent): void {
    this.configName.set(a.name);
    this.configPrompt.set(a.systemPrompt || '');
    this.configModel.set(a.model || 'claude-sonnet-4-6');
    this.configAgent.set(a);
  }

  createAgent(): void {
    const name = this.nameInput().trim();
    const email = this.emailInput().trim();
    if (!name) { this.toast.show('Agent name is required', 'error'); return; }
    if (!email) { this.toast.show('Agent email is required', 'error'); return; }

    this.api.createAgent({ email, displayName: name, role: 'agent', status: 'active' }).subscribe({
      next: (created) => {
        this.agents.update((list) => [this.toView(created), ...list]);
        this.showList.set(true);
        this.closeModal();
        this.toast.show('Agent created', 'success');
      },
      error: (e) => this.toast.show(e?.message || 'Could not create agent', 'error'),
    });
  }

  /** Flip the active flag on the agent currently open in the drawer. */
  toggleStatus(): void {
    const ca = this.configAgent();
    if (!ca) return;
    this.api.toggleAgent(ca.id).subscribe({
      next: (updated) => {
        const next = { ...ca, active: updated.isActive };
        this.configAgent.set(next);
        this.agents.update((list) => list.map((a) => (a.id === next.id ? next : a)));
      },
      error: (e) => this.toast.show(e?.message || 'Could not update agent', 'error'),
    });
  }

  /** Persist drawer name/prompt/model edits, confirm via toast, then close. */
  saveConfig(): void {
    const ca = this.configAgent();
    if (!ca) return;
    const name = this.configName().trim();
    if (!name) { this.toast.show('Agent name cannot be empty', 'error'); return; }
    const systemPrompt = this.configPrompt();
    const model = this.configModel();

    this.api.updateAgent(ca.id, { displayName: name, systemPrompt, model }).subscribe({
      next: (updated) => {
        this.agents.update((list) =>
          list.map((a) => (a.id === ca.id
            ? { ...a, name: updated.displayName, systemPrompt: updated.systemPrompt ?? systemPrompt, model: updated.model ?? model }
            : a)));
        this.configAgent.set(null);
        this.toast.show('Configuration saved', 'success');
      },
      error: (e) => this.toast.show(e?.message || 'Could not save agent', 'error'),
    });
  }

  /** Flip active state from the list card + confirm via toast. */
  toggleActive(a: Agent): void {
    this.api.toggleAgent(a.id).subscribe({
      next: (updated) => {
        this.agents.update((list) =>
          list.map((x) => (x.id === a.id ? { ...x, active: updated.isActive } : x)));
        this.toast.show(updated.isActive ? `${a.name} activated` : `${a.name} deactivated`, 'success');
      },
      error: (e) => this.toast.show(e?.message || 'Could not update agent', 'error'),
    });
  }

  /** Remove the agent queued in pendingDelete, toast, and close the confirm. */
  deleteAgent(a: Agent): void {
    this.api.deleteAgent(a.id).subscribe({
      next: () => {
        this.agents.update((list) => list.filter((x) => x.id !== a.id));
        this.pendingDelete.set(null);
        if (this.configAgent()?.id === a.id) this.configAgent.set(null);
        this.showList.set(this.agents().length > 0);
        this.toast.show(`${a.name} deleted`, 'success');
      },
      error: (e) => this.toast.show(e?.message || 'Could not delete agent', 'error'),
    });
  }
}
