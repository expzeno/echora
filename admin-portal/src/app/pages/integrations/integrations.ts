import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

type SectionId = 'crm' | 'automation';

interface Integration {
  id: string;
  initials: string;
  color: string;   // icon-circle background
  name: string;
  desc: string;
  section: SectionId;
}

interface WebhookEvent {
  id: string;
  label: string;
  on: boolean;
}

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
      <div class="int-shell">

        <!-- ── header ──────────────────────────────────────────── -->
        <header class="int-head">
          <h1 class="int-title">Integrations</h1>
          <p class="int-subtitle">Connect your tools and automate workflows</p>
        </header>

        <!-- ── section: CRM & Productivity ─────────────────────── -->
        <section class="int-section">
          <h2 class="int-section-title">CRM &amp; Productivity</h2>
          <div class="int-grid">
            @for (it of crm(); track it.id) {
              <article class="int-card">
                <div class="int-card-top">
                  <span class="int-icon" [style.background]="it.color">{{ it.initials }}</span>
                  <span class="int-badge"
                        [class.int-badge--on]="isConnected(it.id)">
                    {{ isConnected(it.id) ? 'Connected' : 'Not Connected' }}
                  </span>
                </div>
                <h3 class="int-card-name">{{ it.name }}</h3>
                <p class="int-card-desc">{{ it.desc }}</p>

                @if (isConnected(it.id)) {
                  <p class="int-synced">Last synced 5 min ago</p>
                  <button type="button" class="int-btn int-btn--danger"
                          (click)="toggle(it.id)">Disconnect</button>
                } @else {
                  <button type="button" class="int-btn int-btn--primary"
                          (click)="toggle(it.id)">Connect</button>
                }
              </article>
            }
          </div>
        </section>

        <!-- ── section: Automation ─────────────────────────────── -->
        <section class="int-section">
          <h2 class="int-section-title">Automation</h2>
          <div class="int-grid">
            @for (it of automation(); track it.id) {
              <article class="int-card">
                <div class="int-card-top">
                  <span class="int-icon" [style.background]="it.color">{{ it.initials }}</span>
                  <span class="int-badge"
                        [class.int-badge--on]="isConnected(it.id)">
                    {{ isConnected(it.id) ? 'Connected' : 'Not Connected' }}
                  </span>
                </div>
                <h3 class="int-card-name">{{ it.name }}</h3>
                <p class="int-card-desc">{{ it.desc }}</p>

                @if (isConnected(it.id)) {
                  <p class="int-synced">Last synced 5 min ago</p>
                  <button type="button" class="int-btn int-btn--danger"
                          (click)="toggle(it.id)">Disconnect</button>
                } @else {
                  <button type="button" class="int-btn int-btn--primary"
                          (click)="toggle(it.id)">Connect</button>
                }
              </article>
            }
          </div>
        </section>

        <!-- ── section: Developer / Webhooks ───────────────────── -->
        <section class="int-section">
          <h2 class="int-section-title">Developer</h2>
          <div class="int-webhook">
            <div class="int-webhook-head">
              <h3 class="int-webhook-title">Webhooks</h3>
              <p class="int-webhook-sub">Send real-time events to your own endpoints</p>
            </div>

            <div class="int-field">
              <label class="int-label" for="wh-url">Webhook URL</label>
              <input id="wh-url" type="url" class="int-input"
                     [(ngModel)]="webhookUrl"
                     placeholder="https://your-app.com/webhooks/echora" />
            </div>

            <div class="int-field">
              <label class="int-label" for="wh-secret">Secret key</label>
              <div class="int-secret-row">
                <input id="wh-secret" [type]="revealSecret() ? 'text' : 'password'"
                       class="int-input" [(ngModel)]="secretKey" readonly />
                <a class="int-link" (click)="regenerate()">Regenerate</a>
              </div>
            </div>

            <div class="int-field">
              <span class="int-label">Events to send</span>
              <div class="int-events">
                @for (ev of events(); track ev.id) {
                  <label class="int-check">
                    <input type="checkbox" [(ngModel)]="ev.on" />
                    <span class="int-check-box"></span>
                    <span class="int-check-label">{{ ev.label }}</span>
                  </label>
                }
              </div>
            </div>

            <div class="int-webhook-actions">
              <button type="button" class="int-btn int-btn--primary">Save Webhook Config</button>
            </div>
          </div>
        </section>

      </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    ion-content { --background: var(--app-bg); }

    .int-shell {
      min-height: 100%;
      padding: 28px 32px;
      background: var(--app-bg);
    }

    /* ── header ───────────────────────────────────────────────── */
    .int-head { margin-bottom: 28px; }
    .int-title {
      font-family: var(--font-display);
      font-size: 24px; font-weight: 700; letter-spacing: -0.5px;
      color: var(--admin-text); margin: 0;
    }
    .int-subtitle {
      font-size: 14px; color: var(--admin-text-secondary); margin: 4px 0 0;
    }

    /* ── section ──────────────────────────────────────────────── */
    .int-section { margin-bottom: 32px; }
    .int-section-title {
      font-family: var(--font-display);
      font-size: 11px; font-weight: 700; letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--admin-text-secondary); margin: 0 0 14px;
    }

    /* ── card grid ────────────────────────────────────────────── */
    .int-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .int-card {
      display: flex; flex-direction: column;
      padding: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      transition: border-color .14s, transform .14s;
    }
    .int-card:hover { border-color: var(--brand-primary); transform: translateY(-2px); }

    .int-card-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .int-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 44px; height: 44px; border-radius: var(--radius-full);
      font-family: var(--font-display);
      font-size: 15px; font-weight: 700; letter-spacing: 0.3px;
      color: #fff;
    }

    /* ── status badge ─────────────────────────────────────────── */
    .int-badge {
      display: inline-flex; align-items: center;
      padding: 4px 11px; border-radius: var(--radius-full);
      font-size: 11.5px; font-weight: 700; letter-spacing: 0.2px;
      background: var(--surface-2); color: var(--admin-text-secondary);
      border: 1px solid var(--border);
    }
    .int-badge--on {
      background: rgba(34, 200, 192, 0.14);
      color: var(--brand-secondary);
      border-color: rgba(34, 200, 192, 0.35);
    }

    .int-card-name {
      font-family: var(--font-display);
      font-size: 16px; font-weight: 700; letter-spacing: -0.2px;
      color: var(--admin-text); margin: 0 0 5px;
    }
    .int-card-desc {
      font-size: 13px; line-height: 1.5;
      color: var(--admin-text-secondary); margin: 0 0 16px;
      flex: 1;
    }
    .int-synced {
      font-size: 12px; color: var(--admin-text-muted); margin: 0 0 12px;
    }

    /* ── buttons ──────────────────────────────────────────────── */
    .int-btn {
      align-self: flex-start;
      padding: 8px 16px; border-radius: var(--radius-md);
      font-family: var(--font-body); font-size: 13px; font-weight: 700;
      cursor: pointer; border: 1px solid transparent;
      transition: background .12s, border-color .12s, color .12s;
    }
    .int-btn--primary {
      background: var(--brand-primary); color: #fff;
    }
    .int-btn--primary:hover { background: var(--brand-primary-deep); }
    .int-btn--danger {
      background: transparent; color: var(--status-urgent);
      border-color: rgba(240, 85, 107, 0.45);
    }
    .int-btn--danger:hover { background: rgba(240, 85, 107, 0.12); border-color: var(--status-urgent); }

    /* ── webhook panel ────────────────────────────────────────── */
    .int-webhook {
      padding: 26px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .int-webhook-head { margin-bottom: 22px; }
    .int-webhook-title {
      font-family: var(--font-display);
      font-size: 18px; font-weight: 700; letter-spacing: -0.3px;
      color: var(--admin-text); margin: 0;
    }
    .int-webhook-sub {
      font-size: 13.5px; color: var(--admin-text-secondary); margin: 5px 0 0;
    }

    .int-field { margin-bottom: 20px; max-width: 520px; }
    .int-label {
      display: block; margin-bottom: 8px;
      font-size: 13px; font-weight: 600; color: var(--admin-text);
    }
    .int-input {
      width: 100%; box-sizing: border-box;
      padding: 10px 13px;
      background: var(--app-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      font-family: var(--font-body); font-size: 14px;
      color: var(--admin-text);
      transition: border-color .12s, box-shadow .12s;
    }
    .int-input::placeholder { color: var(--admin-text-muted); }
    .int-input:focus {
      outline: none; border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px rgba(76, 79, 224, 0.18);
    }
    .int-input[readonly] { color: var(--admin-text-secondary); }

    .int-secret-row { display: flex; align-items: center; gap: 12px; }
    .int-secret-row .int-input { flex: 1; }
    .int-link {
      font-size: 13px; font-weight: 600; color: var(--brand-primary);
      cursor: pointer; white-space: nowrap;
    }
    .int-link:hover { text-decoration: underline; }

    /* ── event checkboxes ─────────────────────────────────────── */
    .int-events { display: flex; flex-direction: column; gap: 12px; }
    .int-check {
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; user-select: none;
    }
    .int-check input { position: absolute; opacity: 0; width: 0; height: 0; }
    .int-check-box {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: var(--radius-sm);
      border: 1.5px solid var(--border); background: var(--app-bg);
      transition: background .12s, border-color .12s;
    }
    .int-check-box::after {
      content: ''; width: 5px; height: 9px;
      border: solid #fff; border-width: 0 2px 2px 0;
      transform: rotate(45deg) translateY(-1px);
      opacity: 0; transition: opacity .12s;
    }
    .int-check input:checked + .int-check-box {
      background: var(--brand-primary); border-color: var(--brand-primary);
    }
    .int-check input:checked + .int-check-box::after { opacity: 1; }
    .int-check input:focus-visible + .int-check-box {
      box-shadow: 0 0 0 3px rgba(76, 79, 224, 0.25);
    }
    .int-check-label { font-size: 14px; color: var(--admin-text); }

    .int-webhook-actions {
      display: flex; justify-content: flex-end;
      margin-top: 8px;
    }

    /* ── responsive ───────────────────────────────────────────── */
    @media (max-width: 900px) {
      .int-grid { grid-template-columns: 1fr; }
      .int-shell { padding: 20px 16px; }
    }
  `],
})
export class IntegrationsPage {
  /** ids of currently-connected integrations */
  private readonly connected = signal<Set<string>>(new Set(['hubspot', 'slack']));

  readonly integrations: Integration[] = [
    { id: 'hubspot',   initials: 'HS', color: '#FF7A59', name: 'HubSpot',       desc: 'Sync contacts and deals with your CRM in real time.',        section: 'crm' },
    { id: 'salesforce',initials: 'SF', color: '#1798C1', name: 'Salesforce',    desc: 'Push conversations and leads straight into Salesforce.',      section: 'crm' },
    { id: 'notion',    initials: 'NT', color: '#2F3437', name: 'Notion',        desc: 'Log resolved conversations to a Notion database.',            section: 'crm' },
    { id: 'zapier',    initials: 'ZP', color: '#FF4A00', name: 'Zapier',        desc: 'Trigger 6,000+ apps from Echora events, no code.',            section: 'automation' },
    { id: 'slack',     initials: 'SL', color: '#7C3AED', name: 'Slack',         desc: 'Get alerts and reply to customers from your channels.',       section: 'automation' },
    { id: 'sheets',    initials: 'GS', color: '#0F9D58', name: 'Google Sheets', desc: 'Export conversation metrics to a live spreadsheet.',          section: 'automation' },
  ];

  readonly crm = computed(() => this.integrations.filter(i => i.section === 'crm'));
  readonly automation = computed(() => this.integrations.filter(i => i.section === 'automation'));

  readonly revealSecret = signal(false);

  webhookUrl = '';
  secretKey = 'whsec_9f3b7a2e8c1d4f60ab52e7c9d013f8a4';

  readonly events = signal<WebhookEvent[]>([
    { id: 'conv_started',  label: 'New conversation started', on: true },
    { id: 'msg_received',  label: 'Message received',         on: true },
    { id: 'conv_resolved', label: 'Conversation resolved',    on: true },
    { id: 'agent_assigned',label: 'Agent assigned',           on: true },
  ]);

  isConnected(id: string): boolean {
    return this.connected().has(id);
  }

  toggle(id: string): void {
    this.connected.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  regenerate(): void {
    // mock: rotate the visible secret so the UI reflects a new key
    const rand = this.secretKey.split('').reverse().join('').slice(0, 32);
    this.secretKey = 'whsec_' + rand;
    this.revealSecret.set(true);
  }
}
