import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

type ContactTag = 'customer' | 'vip' | 'blocked';
type TagFilter = 'all' | ContactTag;

interface ContactHistoryItem {
  id: string;
  snippet: string;
  at: number;                 // epoch ms
  status: 'open' | 'pending' | 'resolved';
}

interface Contact {
  id: string;
  name: string;
  phone: string;              // raw E.164, e.g. +60123456789
  tags: ContactTag[];
  lastSeenAt: number;         // epoch ms
  openConversations: number;
  totalConversations: number;
  history: ContactHistoryItem[];
}

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
      <div class="ct-shell" [class.ct-shell--detail-open]="selectedId()">
        <!-- ── LEFT: contact list ──────────────────────────────────── -->
        <aside class="ct-list" [class.ct-list--hidden]="selectedId()">
          <div class="ct-list-head">
            <h1 class="ct-title">Contacts</h1>
            <div class="ct-search">
              <svg class="ct-search-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              <input
                class="ct-search-input"
                type="text"
                [ngModel]="query()"
                (ngModelChange)="query.set($event)"
                placeholder="Search contacts…" />
            </div>
            <div class="ct-chips" role="tablist">
              @for (t of tagTabs; track t.key) {
                <button
                  class="ct-chip"
                  role="tab"
                  [class.ct-chip--active]="filter() === t.key"
                  [attr.aria-selected]="filter() === t.key"
                  (click)="filter.set(t.key)">
                  {{ t.label }}
                </button>
              }
            </div>
          </div>

          <div class="ct-cards">
            @for (c of filtered(); track c.id) {
              <button
                class="ct-card"
                [class.ct-card--active]="selectedId() === c.id"
                (click)="select(c.id)">
                <span class="ct-avatar" [style.background]="avatarColor(c)">{{ initials(c.name) }}</span>
                <div class="ct-card-body">
                  <div class="ct-card-row">
                    <span class="ct-card-name">{{ c.name }}</span>
                    <span class="ct-card-seen">{{ timeAgo(c.lastSeenAt) }}</span>
                  </div>
                  <div class="ct-card-row">
                    <span class="ct-card-phone">{{ maskPhone(c.phone) }}</span>
                    @if (c.openConversations > 0) {
                      <span class="ct-open-badge">{{ c.openConversations }} open</span>
                    }
                  </div>
                </div>
              </button>
            } @empty {
              <div class="ct-empty-list">No contacts match.</div>
            }
          </div>
        </aside>

        <!-- ── RIGHT: contact detail ───────────────────────────────── -->
        <section class="ct-detail">
          @if (!selected()) {
            <div class="ct-placeholder">
              <svg class="echo-ring" width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden="true">
                <circle cx="70" cy="70" r="14" fill="var(--brand-primary)" opacity="0.9" />
                <circle cx="70" cy="70" r="32" stroke="var(--brand-primary)" stroke-width="1.5" opacity="0.55" />
                <circle cx="70" cy="70" r="50" stroke="var(--brand-secondary)" stroke-width="1.25" opacity="0.32" />
                <circle cx="70" cy="70" r="68" stroke="var(--brand-accent)" stroke-width="1" opacity="0.16" />
              </svg>
              <div class="ct-placeholder-title">Select a contact</div>
              <div class="ct-placeholder-sub">Every voice has a story.</div>
            </div>
          } @else {
            <header class="ct-detail-head">
              <div class="ct-detail-id">
                <span class="ct-avatar ct-avatar--lg" [style.background]="avatarColor(selected()!)">{{ initials(selected()!.name) }}</span>
                <div class="ct-detail-idtext">
                  <div class="ct-detail-name">{{ selected()!.name }}</div>
                  <div class="ct-detail-phone">{{ maskPhone(selected()!.phone) }}</div>
                </div>
              </div>
              <div class="ct-detail-actions">
                <button class="ct-edit">Edit</button>
                <button class="ct-back" (click)="select(null)" aria-label="Back to list">←</button>
              </div>
            </header>

            <div class="ct-detail-scroll">
              <!-- Tags -->
              <div class="ct-tags-row">
                @for (tag of selected()!.tags; track tag) {
                  <span class="ct-tag" [ngClass]="'ct-tag--' + tag">{{ tagLabel(tag) }}</span>
                }
                <button class="ct-add-tag">+ Add Tag</button>
              </div>

              <!-- Stats -->
              <div class="ct-stats">
                <div class="ct-stat">
                  <div class="ct-stat-val">{{ selected()!.totalConversations }}</div>
                  <div class="ct-stat-label">Total Conversations</div>
                </div>
                <div class="ct-stat">
                  <div class="ct-stat-val">{{ selected()!.openConversations }}</div>
                  <div class="ct-stat-label">Open</div>
                </div>
                <div class="ct-stat">
                  <div class="ct-stat-val">{{ dateLabel(selected()!.lastSeenAt) }}</div>
                  <div class="ct-stat-label">Last Active</div>
                </div>
              </div>

              <!-- Conversation history -->
              <div class="ct-section">
                <div class="ct-section-title">Recent Conversations</div>
                <div class="ct-history">
                  @for (h of selected()!.history.slice(0, 3); track h.id) {
                    <div class="ct-history-item">
                      <span class="ct-hist-dot" [ngClass]="'ct-hist-dot--' + h.status"></span>
                      <span class="ct-hist-snippet">{{ h.snippet }}</span>
                      <span class="ct-hist-time">{{ timeAgo(h.at) }}</span>
                    </div>
                  } @empty {
                    <div class="ct-empty-list">No conversations yet.</div>
                  }
                </div>
              </div>

              <!-- Notes -->
              <div class="ct-section">
                <div class="ct-section-title">Notes</div>
                <textarea
                  class="ct-notes-input"
                  rows="3"
                  [ngModel]="note()"
                  (ngModelChange)="note.set($event)"
                  placeholder="Add a note about this contact…"></textarea>
                <div class="ct-notes-actions">
                  <button class="ct-notes-save" [disabled]="!note().trim()" (click)="saveNote()">Save</button>
                </div>
              </div>
            </div>
          }
        </section>
      </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    ion-content { --background: var(--app-bg); }

    .ct-shell {
      display: flex;
      height: 100%;
      background: var(--app-bg);
    }

    /* ── LEFT LIST ────────────────────────────────────────────── */
    .ct-list {
      width: 320px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border-right: 1px solid var(--border);
      min-height: 0;
    }
    .ct-list-head { padding: 20px 16px 8px; }
    .ct-title {
      font-family: var(--font-display);
      font-size: 24px; font-weight: 700; letter-spacing: -0.5px;
      color: var(--admin-text); margin: 0 0 14px;
    }

    .ct-search { position: relative; margin-bottom: 12px; }
    .ct-search-ic {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--admin-text-muted); pointer-events: none;
    }
    .ct-search-input {
      width: 100%; box-sizing: border-box;
      padding: 9px 12px 9px 32px;
      background: var(--app-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--admin-text);
      font-family: var(--font-body); font-size: 14px;
      outline: none; transition: border-color .15s;
    }
    .ct-search-input::placeholder { color: var(--admin-text-muted); }
    .ct-search-input:focus { border-color: var(--brand-primary); }

    .ct-chips { display: flex; gap: 4px; flex-wrap: wrap; }
    .ct-chip {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 5px 12px;
      background: transparent; border: 1px solid var(--border); border-radius: var(--radius-full);
      color: var(--admin-text-secondary);
      font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
      cursor: pointer; transition: background .15s, color .15s, border-color .15s;
    }
    .ct-chip:hover { color: var(--admin-text); background: var(--surface-2); }
    .ct-chip--active { color: #fff; background: var(--brand-primary); border-color: var(--brand-primary); }

    .ct-cards {
      flex: 1; overflow-y: auto; padding: 6px 8px 16px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .ct-card {
      display: flex; gap: 11px; align-items: center;
      width: 100%; text-align: left;
      padding: 11px 10px;
      background: transparent; border: none; border-radius: var(--radius-md);
      cursor: pointer; transition: background .12s;
      border-left: 2px solid transparent;
    }
    .ct-card:hover { background: var(--surface-2); }
    .ct-card--active {
      background: rgba(99,102,241,0.14);
      border-left-color: var(--brand-primary);
    }

    .ct-avatar {
      flex-shrink: 0;
      width: 38px; height: 38px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-family: var(--font-body); font-size: 13px; font-weight: 700;
      color: #fff; letter-spacing: 0.3px;
    }
    .ct-avatar--lg {
      width: 56px; height: 56px; font-size: 19px;
    }

    .ct-card-body { flex: 1; min-width: 0; }
    .ct-card-row {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .ct-card-row + .ct-card-row { margin-top: 3px; }
    .ct-card-name {
      font-size: 14px; font-weight: 700;
      color: var(--admin-text); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    .ct-card-seen {
      font-size: 11px; color: var(--admin-text-muted); white-space: nowrap; flex-shrink: 0;
    }
    .ct-card-phone {
      font-family: var(--font-mono); font-size: 12.5px;
      color: var(--admin-text-secondary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ct-open-badge {
      flex-shrink: 0; padding: 2px 8px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 10.5px; font-weight: 700; line-height: 1;
      color: var(--ec-obsidian, #0A0D14);
      background: var(--brand-accent); border-radius: var(--radius-full);
    }
    .ct-empty-list {
      padding: 32px 12px; text-align: center;
      font-size: 13px; color: var(--admin-text-muted);
    }

    /* ── RIGHT DETAIL ─────────────────────────────────────────── */
    .ct-detail {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column;
      background: var(--app-bg);
    }

    .ct-placeholder {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 6px;
      padding: 24px; text-align: center;
    }
    .echo-ring { margin-bottom: 14px; animation: echo-pulse 4s ease-in-out infinite; }
    @keyframes echo-pulse {
      0%, 100% { opacity: 0.85; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.03); }
    }
    .ct-placeholder-title {
      font-family: var(--font-display); font-size: 18px; font-weight: 600;
      color: var(--admin-text);
    }
    .ct-placeholder-sub { font-size: 13.5px; color: var(--admin-text-muted); }

    .ct-detail-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 22px; gap: 12px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .ct-detail-id { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .ct-detail-idtext { min-width: 0; }
    .ct-detail-name {
      font-family: var(--font-display); font-size: 18px; font-weight: 700;
      color: var(--admin-text); letter-spacing: -0.3px;
    }
    .ct-detail-phone {
      font-family: var(--font-mono); font-size: 13.5px;
      color: var(--admin-text-secondary); margin-top: 3px;
    }

    .ct-detail-actions { display: flex; align-items: center; gap: 10px; }
    .ct-edit {
      padding: 7px 16px;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--admin-text); font-family: var(--font-body);
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: background .15s, border-color .15s;
    }
    .ct-edit:hover { border-color: var(--brand-primary); background: var(--surface); }
    .ct-back {
      display: none;
      width: 34px; height: 34px; border-radius: var(--radius-md);
      background: var(--surface-2); border: 1px solid var(--border);
      color: var(--admin-text); font-size: 17px; cursor: pointer;
    }

    .ct-detail-scroll {
      flex: 1; overflow-y: auto;
      padding: 22px; display: flex; flex-direction: column; gap: 24px;
    }

    /* Tags */
    .ct-tags-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ct-tag {
      font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      padding: 4px 11px; border-radius: var(--radius-full);
    }
    .ct-tag--customer { color: var(--brand-secondary); background: rgba(20,184,166,0.14); }
    .ct-tag--vip { color: var(--brand-primary); background: rgba(99,102,241,0.16); }
    .ct-tag--blocked { color: #F87171; background: rgba(248,113,113,0.14); }
    .ct-add-tag {
      padding: 3px 4px;
      background: transparent; border: none;
      color: var(--brand-primary); font-family: var(--font-body);
      font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .ct-add-tag:hover { text-decoration: underline; }

    /* Stats */
    .ct-stats {
      display: flex; gap: 12px;
    }
    .ct-stat {
      flex: 1; padding: 14px 16px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .ct-stat-val {
      font-family: var(--font-display); font-size: 20px; font-weight: 700;
      color: var(--admin-text); letter-spacing: -0.3px;
    }
    .ct-stat-label {
      font-size: 11.5px; color: var(--admin-text-muted); margin-top: 4px;
    }

    /* Sections */
    .ct-section { display: flex; flex-direction: column; gap: 10px; }
    .ct-section-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
      color: var(--admin-text-muted);
    }

    /* History */
    .ct-history { display: flex; flex-direction: column; gap: 2px; }
    .ct-history-item {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 12px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }
    .ct-hist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .ct-hist-dot--open { background: var(--status-live, #34D399); box-shadow: 0 0 0 3px rgba(52,211,153,0.15); }
    .ct-hist-dot--pending { background: var(--status-warn, #FFB13C); box-shadow: 0 0 0 3px rgba(255,177,60,0.15); }
    .ct-hist-dot--resolved { background: var(--admin-text-muted); }
    .ct-hist-snippet {
      flex: 1; min-width: 0;
      font-size: 13px; color: var(--admin-text-secondary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ct-hist-time {
      flex-shrink: 0; font-size: 11px; color: var(--admin-text-muted);
    }

    /* Notes */
    .ct-notes-input {
      width: 100%; box-sizing: border-box; resize: vertical; min-height: 72px;
      padding: 11px 14px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--admin-text); font-family: var(--font-body);
      font-size: 14px; line-height: 1.45; outline: none;
      transition: border-color .15s;
    }
    .ct-notes-input::placeholder { color: var(--admin-text-muted); }
    .ct-notes-input:focus { border-color: var(--brand-primary); }
    .ct-notes-actions { display: flex; justify-content: flex-end; }
    .ct-notes-save {
      padding: 8px 22px;
      background: var(--brand-primary); border: none; border-radius: var(--radius-md);
      color: #fff; font-family: var(--font-body); font-size: 13.5px; font-weight: 600;
      cursor: pointer; transition: background .15s, opacity .15s;
    }
    .ct-notes-save:hover:not(:disabled) { background: var(--brand-primary-deep, #4F46E5); }
    .ct-notes-save:disabled { opacity: 0.45; cursor: not-allowed; }

    /* ── RESPONSIVE (<768px) ──────────────────────────────────── */
    @media (max-width: 767px) {
      .ct-list { width: 100%; border-right: none; }
      .ct-list--hidden { display: none; }
      .ct-shell:not(.ct-shell--detail-open) .ct-detail { display: none; }
      .ct-back { display: inline-flex; align-items: center; justify-content: center; }
      .ct-stats { flex-direction: column; }
      /* Clear the fixed mobile menu FAB (top 12px, 42px tall) so headers aren't overlapped. */
      .ct-list-head { padding-top: 60px; }
      .ct-detail-head { padding-top: 60px; }
    }
  `],
})
export class ContactsPage {
  private readonly toast = inject(ToastService);

  readonly tagTabs: { key: TagFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'customer', label: 'Customer' },
    { key: 'vip', label: 'VIP' },
    { key: 'blocked', label: 'Blocked' },
  ];

  readonly query = signal('');
  readonly filter = signal<TagFilter>('all');
  readonly note = signal('');

  // Palette for deterministic avatar tinting — indigo-leaning brand hues.
  private readonly avatarPalette = ['#6366F1', '#14B8A6', '#818CF8', '#0EA5A0', '#7C7EF2'];

  // Placeholder data — real contact wiring lands with the CRM service.
  private readonly now = Date.now();
  readonly contacts = signal<Contact[]>([
    {
      id: 'p1', name: 'Aisha Rahman', phone: '+60123456789',
      tags: ['customer', 'vip'], lastSeenAt: this.now - 2 * 3_600_000,
      openConversations: 2, totalConversations: 14,
      history: [
        { id: 'h1', snippet: 'Hi, is my order shipped yet?', at: this.now - 2 * 3_600_000, status: 'open' },
        { id: 'h2', snippet: 'Thanks! That resolved it.', at: this.now - 3 * 86_400_000, status: 'resolved' },
        { id: 'h3', snippet: 'Can I change my delivery address?', at: this.now - 6 * 86_400_000, status: 'resolved' },
      ],
    },
    {
      id: 'p2', name: 'Ravi Kumar', phone: '+60198887766',
      tags: ['customer'], lastSeenAt: this.now - 26 * 3_600_000,
      openConversations: 0, totalConversations: 6,
      history: [
        { id: 'h1', snippet: 'Perfect, appreciate the quick help.', at: this.now - 26 * 3_600_000, status: 'resolved' },
        { id: 'h2', snippet: 'Waiting on the refund confirmation…', at: this.now - 4 * 86_400_000, status: 'pending' },
      ],
    },
    {
      id: 'p3', name: 'Mei Ling Tan', phone: '+60171234567',
      tags: ['vip'], lastSeenAt: this.now - 20 * 60_000,
      openConversations: 1, totalConversations: 22,
      history: [
        { id: 'h1', snippet: 'Waiting on the refund confirmation…', at: this.now - 20 * 60_000, status: 'pending' },
        { id: 'h2', snippet: 'The premium plan looks great, upgrading now.', at: this.now - 2 * 86_400_000, status: 'resolved' },
        { id: 'h3', snippet: 'Do you ship to Sabah?', at: this.now - 9 * 86_400_000, status: 'resolved' },
      ],
    },
    {
      id: 'p4', name: 'Daniel Wong', phone: '+60126549870',
      tags: ['customer'], lastSeenAt: this.now - 3 * 86_400_000,
      openConversations: 0, totalConversations: 3,
      history: [
        { id: 'h1', snippet: 'Can I change my delivery address?', at: this.now - 3 * 86_400_000, status: 'resolved' },
      ],
    },
    {
      id: 'p5', name: 'Nurul Huda', phone: '+60112233445',
      tags: ['blocked'], lastSeenAt: this.now - 12 * 86_400_000,
      openConversations: 0, totalConversations: 1,
      history: [
        { id: 'h1', snippet: 'The link you sent is broken.', at: this.now - 12 * 86_400_000, status: 'resolved' },
      ],
    },
  ]);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.contacts()
      .filter(c => f === 'all' || c.tags.includes(f))
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  });

  // showList=true, both panels render by default (first contact selected).
  readonly selectedId = signal<string | null>('p1');

  readonly selected = computed(() =>
    this.contacts().find(c => c.id === this.selectedId()) ?? null,
  );

  select(id: string | null): void {
    this.selectedId.set(id);
    this.note.set('');
  }

  saveNote(): void {
    // Placeholder — note persistence is wired with the CRM service.
    this.note.set('');
    this.toast.show('Note saved', 'success');
  }

  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(p => p.charAt(0).toUpperCase())
      .join('');
  }

  avatarColor(c: Contact): string {
    // Deterministic pick from name so a contact keeps the same tint.
    let sum = 0;
    for (const ch of c.name) sum += ch.charCodeAt(0);
    return this.avatarPalette[sum % this.avatarPalette.length];
  }

  tagLabel(tag: ContactTag): string {
    switch (tag) {
      case 'customer': return 'Customer';
      case 'vip': return 'VIP';
      case 'blocked': return 'Blocked';
    }
  }

  /** Mask to +60 1X XXX XXXX, keeping country code + first mobile digit visible. */
  maskPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 6) return raw;
    const cc = digits.slice(0, 2);          // 60
    const lead = digits.slice(2, 4);        // 1X
    const rest = digits.slice(4);
    const mid = rest.slice(0, 3).replace(/./g, 'X');
    const tail = rest.slice(-4);
    return `+${cc} ${lead} ${mid} ${tail}`;
  }

  timeAgo(ts: number): string {
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  dateLabel(ts: number): string {
    const d = new Date(ts);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
}
