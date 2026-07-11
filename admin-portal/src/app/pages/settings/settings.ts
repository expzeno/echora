import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

type TabId = 'general' | 'team' | 'notifications' | 'apikeys' | 'billing';

interface NavTab {
  id: TabId;
  label: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Agent';
}

interface NotifPref {
  id: string;
  label: string;
  desc: string;
  on: boolean;
}

interface ApiKey {
  id: string;
  label: string;
  masked: string;
  created: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
      <div class="set-shell">

        <div class="set-head">
          <h1 class="set-title">Settings</h1>
          <p class="set-subtitle">System configuration</p>
        </div>

        <div class="set-body">

          <!-- ── LEFT NAV ──────────────────────────────────────────── -->
          <nav class="set-nav" aria-label="Settings sections">
            @for (t of tabs; track t.id) {
              <button
                type="button"
                class="set-nav-item"
                [class.set-nav-item--active]="activeTab() === t.id"
                (click)="activeTab.set(t.id)">
                {{ t.label }}
              </button>
            }
          </nav>

          <!-- ── RIGHT CONTENT ─────────────────────────────────────── -->
          <div class="set-content">

            <!-- ── GENERAL ─────────────────────────────────────────── -->
            @if (activeTab() === 'general') {
              <section class="set-panel">
                <div class="set-panel-head">
                  <h2 class="set-panel-title">General</h2>
                  <p class="set-panel-sub">Basic organization preferences.</p>
                </div>

                <div class="set-field">
                  <label class="set-label" for="set-org">Organization name</label>
                  <input
                    id="set-org"
                    class="set-input"
                    type="text"
                    [ngModel]="orgName()"
                    (ngModelChange)="orgName.set($event)"
                    placeholder="Organization name" />
                </div>

                <div class="set-field">
                  <label class="set-label" for="set-tz">Timezone</label>
                  <select
                    id="set-tz"
                    class="set-input set-select"
                    [ngModel]="timezone()"
                    (ngModelChange)="timezone.set($event)">
                    <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (GMT+8)</option>
                    <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="America/New_York">America/New_York (GMT-5)</option>
                  </select>
                </div>

                <div class="set-field">
                  <label class="set-label" for="set-lang">Language</label>
                  <select
                    id="set-lang"
                    class="set-input set-select"
                    [ngModel]="language()"
                    (ngModelChange)="language.set($event)">
                    <option value="en">English</option>
                    <option value="ms">Bahasa Melayu</option>
                    <option value="zh">中文</option>
                    <option value="id">Bahasa Indonesia</option>
                  </select>
                </div>

                <div class="set-panel-actions">
                  <button class="set-btn set-btn--primary" type="button">Save Changes</button>
                </div>
              </section>
            }

            <!-- ── TEAM ────────────────────────────────────────────── -->
            @if (activeTab() === 'team') {
              <section class="set-panel">
                <div class="set-panel-head set-panel-head--row">
                  <div>
                    <h2 class="set-panel-title">Team</h2>
                    <p class="set-panel-sub">Manage who can access this workspace.</p>
                  </div>
                  <button class="set-btn set-btn--primary" type="button" (click)="openInvite()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    Invite Member
                  </button>
                </div>

                <div class="set-list">
                  @for (m of members(); track m.id) {
                    <div class="set-member">
                      <div class="set-avatar">{{ initials(m.name) }}</div>
                      <div class="set-member-info">
                        <span class="set-member-name">{{ m.name }}</span>
                        <span class="set-member-email">{{ m.email }}</span>
                      </div>
                      <span class="set-role" [class.set-role--admin]="m.role === 'Admin'">{{ m.role }}</span>
                      <button class="set-link set-link--danger" type="button">Remove</button>
                    </div>
                  }
                </div>
              </section>
            }

            <!-- ── NOTIFICATIONS ───────────────────────────────────── -->
            @if (activeTab() === 'notifications') {
              <section class="set-panel">
                <div class="set-panel-head">
                  <h2 class="set-panel-title">Notifications</h2>
                  <p class="set-panel-sub">Choose what you want to be alerted about.</p>
                </div>

                <div class="set-list">
                  @for (n of notifs(); track n.id) {
                    <div class="set-toggle-row">
                      <div class="set-toggle-text">
                        <span class="set-toggle-label">{{ n.label }}</span>
                        <span class="set-toggle-desc">{{ n.desc }}</span>
                      </div>
                      <button
                        type="button"
                        class="set-switch"
                        [class.set-switch--on]="n.on"
                        role="switch"
                        [attr.aria-checked]="n.on"
                        [attr.aria-label]="n.label"
                        (click)="toggleNotif(n.id)">
                        <span class="set-switch-knob"></span>
                      </button>
                    </div>
                  }
                </div>
              </section>
            }

            <!-- ── API KEYS ────────────────────────────────────────── -->
            @if (activeTab() === 'apikeys') {
              <section class="set-panel">
                <div class="set-panel-head set-panel-head--row">
                  <div>
                    <h2 class="set-panel-title">API Keys</h2>
                    <p class="set-panel-sub">Keys grant programmatic access to your workspace.</p>
                  </div>
                  <button class="set-btn set-btn--primary" type="button" (click)="openGenerate()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    </svg>
                    Generate New Key
                  </button>
                </div>

                <div class="set-list">
                  @for (k of apiKeys(); track k.id) {
                    <div class="set-key">
                      <div class="set-key-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M15 7a4 4 0 1 0-3.9 5H14l1.5 1.5L17 12l1.5 1.5L21 11l-2-2h-2.1A4 4 0 0 0 15 7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
                          <circle cx="15" cy="7" r="1.1" fill="currentColor" />
                        </svg>
                      </div>
                      <div class="set-key-info">
                        <span class="set-key-label">{{ k.label }}</span>
                        <span class="set-key-masked">{{ k.masked }}</span>
                      </div>
                      <span class="set-key-date">Created {{ k.created }}</span>
                      <button class="set-link set-link--danger" type="button">Revoke</button>
                    </div>
                  }
                </div>
              </section>
            }

            <!-- ── BILLING ─────────────────────────────────────────── -->
            @if (activeTab() === 'billing') {
              <section class="set-panel">
                <div class="set-panel-head">
                  <h2 class="set-panel-title">Billing</h2>
                  <p class="set-panel-sub">Your current plan and usage.</p>
                </div>

                <div class="set-plan">
                  <div class="set-plan-top">
                    <div>
                      <span class="set-plan-badge">Current plan</span>
                      <h3 class="set-plan-name">Starter</h3>
                      <p class="set-plan-desc">3 agents · 500 conversations / mo</p>
                    </div>
                    <button class="set-btn set-btn--teal" type="button">Upgrade Plan</button>
                  </div>

                  <div class="set-usage">
                    <div class="set-usage-head">
                      <span class="set-usage-label">Conversations used</span>
                      <span class="set-usage-value">340 / 500</span>
                    </div>
                    <div class="set-usage-track">
                      <div class="set-usage-fill" [style.width.%]="usagePct()"></div>
                    </div>
                    <span class="set-usage-hint">{{ usagePct() }}% of your monthly quota used</span>
                  </div>
                </div>
              </section>
            }

          </div>
        </div>

        <!-- ── INVITE MODAL ──────────────────────────────────────── -->
        @if (inviteOpen()) {
          <div class="set-backdrop" (click)="closeInvite()">
            <div class="set-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
                 aria-labelledby="set-invite-title">
              <button class="set-modal-close" type="button" (click)="closeInvite()" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>
              <h2 id="set-invite-title" class="set-modal-title">Invite Member</h2>

              <div class="set-field">
                <label class="set-label" for="set-invite-email">Email address</label>
                <input
                  id="set-invite-email"
                  class="set-input"
                  type="email"
                  [ngModel]="inviteEmail()"
                  (ngModelChange)="inviteEmail.set($event)"
                  placeholder="name@company.com" />
              </div>

              <div class="set-field">
                <label class="set-label" for="set-invite-role">Role</label>
                <select
                  id="set-invite-role"
                  class="set-input set-select"
                  [ngModel]="inviteRole()"
                  (ngModelChange)="inviteRole.set($event)">
                  <option value="Agent">Agent</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div class="set-modal-actions">
                <button class="set-btn set-btn--ghost" type="button" (click)="closeInvite()">Cancel</button>
                <button class="set-btn set-btn--primary" type="button" (click)="closeInvite()">Send Invite</button>
              </div>
            </div>
          </div>
        }

        <!-- ── GENERATE KEY MODAL ────────────────────────────────── -->
        @if (generateOpen()) {
          <div class="set-backdrop" (click)="closeGenerate()">
            <div class="set-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
                 aria-labelledby="set-gen-title">
              <button class="set-modal-close" type="button" (click)="closeGenerate()" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>
              <h2 id="set-gen-title" class="set-modal-title">Generate New Key</h2>

              <div class="set-field">
                <label class="set-label" for="set-gen-label">Key label</label>
                <input
                  id="set-gen-label"
                  class="set-input"
                  type="text"
                  [ngModel]="genLabel()"
                  (ngModelChange)="genLabel.set($event)"
                  placeholder="Production server" />
              </div>

              <div class="set-modal-actions">
                <button class="set-btn set-btn--ghost" type="button" (click)="closeGenerate()">Cancel</button>
                <button class="set-btn set-btn--primary" type="button" (click)="closeGenerate()">Confirm</button>
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

    .set-shell {
      min-height: 100%;
      padding: 28px 32px;
      background: var(--app-bg);
    }

    /* ── header ───────────────────────────────────────────────── */
    .set-head { margin-bottom: 24px; }
    .set-title {
      font-family: var(--font-display);
      font-size: 24px; font-weight: 700; letter-spacing: -0.5px;
      color: var(--admin-text); margin: 0;
    }
    .set-subtitle {
      font-size: 14px; color: var(--admin-text-secondary); margin: 4px 0 0;
    }

    /* ── layout ───────────────────────────────────────────────── */
    .set-body {
      display: flex; align-items: flex-start; gap: 24px;
    }

    /* ── left nav ─────────────────────────────────────────────── */
    .set-nav {
      flex: 0 0 200px; width: 200px;
      display: flex; flex-direction: column; gap: 2px;
      padding: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      position: sticky; top: 28px;
    }
    .set-nav-item {
      display: block; width: 100%; text-align: left;
      padding: 10px 12px 10px 13px;
      background: transparent; border: none;
      border-left: 3px solid transparent;
      border-radius: var(--radius-sm);
      font-family: var(--font-body); font-size: 14px; font-weight: 600;
      color: var(--admin-text-secondary); cursor: pointer;
      transition: background .12s, color .12s, border-color .12s;
    }
    .set-nav-item:hover { background: var(--surface-2); color: var(--admin-text); }
    .set-nav-item--active {
      background: rgba(76,79,224,0.14);
      border-left-color: var(--brand-primary);
      color: var(--brand-primary);
    }

    /* ── content panel ────────────────────────────────────────── */
    .set-content { flex: 1; min-width: 0; }
    .set-panel {
      padding: 26px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .set-panel-head { margin-bottom: 22px; }
    .set-panel-head--row {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
    }
    .set-panel-title {
      font-family: var(--font-display);
      font-size: 18px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--admin-text); margin: 0;
    }
    .set-panel-sub {
      font-size: 13.5px; color: var(--admin-text-secondary); margin: 5px 0 0; line-height: 1.5;
    }
    .set-panel-actions {
      display: flex; justify-content: flex-end; margin-top: 8px;
    }

    /* ── fields ───────────────────────────────────────────────── */
    .set-field { margin-bottom: 20px; max-width: 460px; }
    .set-label {
      display: block; font-size: 13px; font-weight: 600;
      color: var(--admin-text-body); margin-bottom: 7px;
    }
    .set-input {
      width: 100%; box-sizing: border-box;
      padding: 11px 13px;
      background: var(--app-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--admin-text);
      font-family: var(--font-body); font-size: 14px;
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .set-input::placeholder { color: var(--admin-text-muted); }
    .set-input:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(76,79,224,0.15); }
    .set-select { cursor: pointer; appearance: none; -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 12px center; padding-right: 38px;
    }

    /* ── buttons ──────────────────────────────────────────────── */
    .set-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 16px; border-radius: var(--radius-md);
      font-family: var(--font-body); font-size: 14px; font-weight: 600;
      border: 1px solid transparent; cursor: pointer; white-space: nowrap;
      transition: filter .15s, background .15s, border-color .15s;
    }
    .set-btn--primary {
      background: var(--brand-primary); color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .set-btn--primary:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(76,79,224,0.32); }
    .set-btn--primary:active { filter: brightness(0.96); }
    .set-btn--teal {
      background: var(--brand-secondary); color: #04201f;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .set-btn--teal:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(34,200,192,0.32); }
    .set-btn--ghost {
      background: transparent; color: var(--admin-text-secondary);
      border-color: var(--border);
    }
    .set-btn--ghost:hover { background: var(--surface-2); color: var(--admin-text); }

    /* ── generic list ─────────────────────────────────────────── */
    .set-list { display: flex; flex-direction: column; }

    /* ── team member row ──────────────────────────────────────── */
    .set-member {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 0;
      border-top: 1px solid var(--border);
    }
    .set-member:first-child { border-top: none; padding-top: 4px; }
    .set-avatar {
      width: 40px; height: 40px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: rgba(76,79,224,0.16); color: var(--brand-primary);
      font-family: var(--font-display); font-size: 14px; font-weight: 700;
    }
    .set-member-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .set-member-name {
      font-size: 14.5px; font-weight: 600; color: var(--admin-text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .set-member-email {
      font-size: 13px; color: var(--admin-text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .set-role {
      flex-shrink: 0;
      padding: 3px 11px; border-radius: var(--radius-full);
      font-size: 12px; font-weight: 600; letter-spacing: 0.2px;
      background: var(--surface-2); color: var(--admin-text-secondary);
    }
    .set-role--admin { background: rgba(76,79,224,0.14); color: var(--brand-primary); }

    /* ── links ────────────────────────────────────────────────── */
    .set-link {
      flex-shrink: 0;
      background: transparent; border: none; cursor: pointer;
      padding: 6px 10px; border-radius: var(--radius-sm);
      font-family: var(--font-body); font-size: 13px; font-weight: 600;
      color: var(--admin-text-secondary); transition: background .12s, color .12s;
    }
    .set-link:hover { background: var(--surface-2); color: var(--admin-text); }
    .set-link--danger { color: var(--status-urgent); }
    .set-link--danger:hover { background: rgba(240,85,107,0.12); color: var(--status-urgent); }

    /* ── notification toggle rows ─────────────────────────────── */
    .set-toggle-row {
      display: flex; align-items: center; justify-content: space-between; gap: 18px;
      padding: 16px 0;
      border-top: 1px solid var(--border);
    }
    .set-toggle-row:first-child { border-top: none; padding-top: 4px; }
    .set-toggle-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .set-toggle-label { font-size: 14.5px; font-weight: 600; color: var(--admin-text); }
    .set-toggle-desc { font-size: 13px; color: var(--admin-text-muted); line-height: 1.4; }

    .set-switch {
      position: relative; flex-shrink: 0;
      width: 44px; height: 26px; padding: 0;
      border: none; border-radius: var(--radius-full);
      background: var(--surface-2); cursor: pointer;
      transition: background .18s;
    }
    .set-switch-knob {
      position: absolute; top: 3px; left: 3px;
      width: 20px; height: 20px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      transition: transform .18s;
    }
    .set-switch--on { background: var(--brand-primary); }
    .set-switch--on .set-switch-knob { transform: translateX(18px); }

    /* ── api key rows ─────────────────────────────────────────── */
    .set-key {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 0;
      border-top: 1px solid var(--border);
    }
    .set-key:first-child { border-top: none; padding-top: 4px; }
    .set-key-icon {
      width: 38px; height: 38px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md);
      background: rgba(34,200,192,0.14); color: var(--brand-secondary);
    }
    .set-key-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .set-key-label { font-size: 14px; font-weight: 600; color: var(--admin-text); }
    .set-key-masked {
      font-family: var(--font-mono); font-size: 13px; color: var(--admin-text-muted);
      letter-spacing: 0.5px;
    }
    .set-key-date {
      flex-shrink: 0; font-size: 12.5px; color: var(--admin-text-muted);
    }

    /* ── billing ──────────────────────────────────────────────── */
    .set-plan {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 22px;
      background: var(--app-bg);
    }
    .set-plan-top {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
      margin-bottom: 22px;
    }
    .set-plan-badge {
      display: inline-block;
      font-size: 12px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase;
      color: var(--admin-text-muted); margin-bottom: 6px;
    }
    .set-plan-name {
      font-family: var(--font-display);
      font-size: 22px; font-weight: 700; letter-spacing: -0.4px;
      color: var(--admin-text); margin: 0;
    }
    .set-plan-desc { font-size: 13.5px; color: var(--admin-text-secondary); margin: 5px 0 0; }

    .set-usage-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .set-usage-label { font-size: 13px; font-weight: 600; color: var(--admin-text-body); }
    .set-usage-value { font-size: 13px; font-weight: 600; color: var(--admin-text); font-family: var(--font-mono); }
    .set-usage-track {
      width: 100%; height: 8px; border-radius: var(--radius-full);
      background: var(--surface-2); overflow: hidden;
    }
    .set-usage-fill {
      height: 100%; border-radius: var(--radius-full);
      background: var(--brand-primary);
      transition: width .3s;
    }
    .set-usage-hint { display: block; font-size: 12.5px; color: var(--admin-text-muted); margin-top: 8px; }

    /* ── modals ───────────────────────────────────────────────── */
    .set-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      background: rgba(6,8,16,0.66);
      backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
    }
    .set-modal {
      position: relative;
      width: 440px; max-width: 100%;
      max-height: calc(100vh - 48px); overflow-y: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 28px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    }
    .set-modal-close {
      position: absolute; top: 16px; right: 16px;
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; border-radius: var(--radius-sm);
      color: var(--admin-text-muted); cursor: pointer; transition: background .12s, color .12s;
    }
    .set-modal-close:hover { background: var(--surface-2); color: var(--admin-text); }
    .set-modal-title {
      font-family: var(--font-display);
      font-size: 19px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--admin-text); margin: 0 0 22px; padding-right: 32px;
    }
    .set-modal-actions {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;
    }

    /* ── responsive ───────────────────────────────────────────── */
    @media (max-width: 767px) {
      .set-shell { padding: 64px 16px 24px; }
      .set-body { flex-direction: column; }
      .set-nav {
        flex: 1 1 auto; width: 100%; position: static;
        flex-direction: row; flex-wrap: wrap; gap: 4px;
      }
      .set-nav-item {
        flex: 1 1 auto; text-align: center;
        border-left: none; border-bottom: 3px solid transparent;
      }
      .set-nav-item--active { border-left: none; border-bottom-color: var(--brand-primary); }
      .set-content { width: 100%; }
      .set-panel { padding: 20px 16px; }
      .set-panel-head--row { flex-direction: column; align-items: stretch; }
      .set-plan-top { flex-direction: column; align-items: stretch; }
      .set-member-email { display: none; }
      .set-key-date { display: none; }
      .set-modal { padding: 22px 18px; }
    }
  `],
})
export class SettingsPage {
  readonly tabs: NavTab[] = [
    { id: 'general', label: 'General' },
    { id: 'team', label: 'Team' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'apikeys', label: 'API Keys' },
    { id: 'billing', label: 'Billing' },
  ];

  readonly activeTab = signal<TabId>('general');

  // ── general ──────────────────────────────────────────────────
  readonly orgName = signal('Echora Demo');
  readonly timezone = signal('Asia/Kuala_Lumpur');
  readonly language = signal('en');

  // ── team ─────────────────────────────────────────────────────
  readonly members = signal<Member[]>([
    { id: 'm1', name: 'Aisha Rahman', email: 'aisha@echora.demo', role: 'Admin' },
    { id: 'm2', name: 'Marcus Lim', email: 'marcus@echora.demo', role: 'Agent' },
    { id: 'm3', name: 'Priya Nair', email: 'priya@echora.demo', role: 'Agent' },
  ]);
  readonly inviteOpen = signal(false);
  readonly inviteEmail = signal('');
  readonly inviteRole = signal<'Admin' | 'Agent'>('Agent');

  // ── notifications ────────────────────────────────────────────
  readonly notifs = signal<NotifPref[]>([
    { id: 'assigned', label: 'New conversation assigned', desc: 'Alert me when a conversation is routed to me.', on: true },
    { id: 'resolved', label: 'Conversation resolved', desc: 'Notify when a conversation is marked resolved.', on: true },
    { id: 'unread', label: 'Unread message after 5 min', desc: 'Ping me if a customer message goes unread.', on: false },
    { id: 'summary', label: 'Daily summary email', desc: 'A recap of activity delivered every morning.', on: true },
  ]);

  // ── api keys ─────────────────────────────────────────────────
  readonly apiKeys = signal<ApiKey[]>([
    { id: 'k1', label: 'Production server', masked: '•••••••••••abc123', created: 'Mar 4, 2026' },
  ]);
  readonly generateOpen = signal(false);
  readonly genLabel = signal('');

  // ── billing ──────────────────────────────────────────────────
  readonly usagePct = computed(() => 68);

  // ── helpers ──────────────────────────────────────────────────
  initials(name: string): string {
    return name
      .split(/\s+/)
      .map((p) => p.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  toggleNotif(id: string): void {
    this.notifs.update((list) =>
      list.map((n) => (n.id === id ? { ...n, on: !n.on } : n)),
    );
  }

  openInvite(): void { this.inviteEmail.set(''); this.inviteRole.set('Agent'); this.inviteOpen.set(true); }
  closeInvite(): void { this.inviteOpen.set(false); }

  openGenerate(): void { this.genLabel.set(''); this.generateOpen.set(true); }
  closeGenerate(): void { this.generateOpen.set(false); }
}
