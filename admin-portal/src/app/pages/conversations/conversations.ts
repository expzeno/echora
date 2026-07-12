import { Component, computed, signal, inject, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { ConversationService, Conversation as ApiConversation, Message as ApiMessage } from '../../services/conversation.service';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

// ── Socket.IO real-time payload (event: message:new) ─────────────────────────
interface MessageNewPayload {
  conversationId: string;
  message: {
    id: string;
    direction: 'inbound' | 'outbound';
    content: string | null;
    createdAt: string;
  };
}

type ConvStatus = 'open' | 'pending' | 'resolved' | 'closed';
type ConvFilter = 'all' | 'open' | 'pending' | 'resolved';

interface Conversation {
  id: string;
  customerPhone: string;      // raw E.164, e.g. +60123456789
  preview: string;
  status: ConvStatus;
  unreadCount: number;
  assignedAgent: string | null;
  lastMessageAt: number;      // epoch ms
}

type MessageSender = 'customer' | 'ai' | 'human';

interface ThreadMessage {
  id: string;
  from: MessageSender;
  body: string;
  at: number;
}

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
      <div class="conv-shell" [class.conv-shell--detail-open]="selectedId()">
        <!-- ── LEFT: conversation list ─────────────────────────────── -->
        <aside class="conv-list" [class.conv-list--hidden]="selectedId()">
          <div class="conv-list-head">
            <h1 class="conv-title">Conversations</h1>
            <div class="conv-search">
              <svg class="conv-search-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              <input
                class="conv-search-input"
                type="text"
                [ngModel]="query()"
                (ngModelChange)="query.set($event)"
                placeholder="Search conversations…" />
            </div>
            <div class="conv-tabs" role="tablist">
              @for (t of tabs; track t.key) {
                <button
                  class="conv-tab"
                  role="tab"
                  [class.conv-tab--active]="filter() === t.key"
                  [attr.aria-selected]="filter() === t.key"
                  (click)="filter.set(t.key)">
                  {{ t.label }}
                  @if (countFor(t.key); as n) {
                    <span class="conv-tab-count">{{ n }}</span>
                  }
                </button>
              }
            </div>
          </div>

          <div class="conv-cards">
            @if (listLoading()) {
              <div class="conv-empty-list">Loading conversations…</div>
            } @else if (listError()) {
              <div class="conv-empty-list">
                Couldn't load conversations.
                <button class="conv-retry conv-retry--sm" (click)="loadConversations()">Retry</button>
              </div>
            } @else {
            @for (c of filtered(); track c.id) {
              <button
                class="conv-card"
                [class.conv-card--active]="selectedId() === c.id"
                [class.conv-card--unread]="unreadFor(c) > 0"
                (click)="select(c.id)">
                <span class="conv-dot" [ngClass]="'conv-dot--' + c.status" [attr.aria-label]="c.status"></span>
                <div class="conv-card-body">
                  <div class="conv-card-row">
                    <span class="conv-card-phone">{{ maskPhone(c.customerPhone) }}</span>
                    <span class="conv-card-time">{{ timeAgo(c.lastMessageAt) }}</span>
                  </div>
                  <div class="conv-card-row">
                    <span class="conv-card-preview">{{ c.preview }}</span>
                    @if (unreadFor(c); as unread) {
                      @if (unread > 0) {
                        <span
                          class="conv-unread"
                          [attr.aria-label]="unread + ' unread messages'">{{ unread > 99 ? '99+' : unread }}</span>
                      }
                    }
                  </div>
                </div>
              </button>
            } @empty {
              <div class="conv-empty-list">No conversations match.</div>
            }
            }
          </div>
        </aside>

        <!-- ── RIGHT: conversation detail ──────────────────────────── -->
        <section class="conv-detail">
          @if (!selected()) {
            <div class="conv-placeholder">
              <svg class="echo-ring" width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden="true">
                <circle cx="70" cy="70" r="14" fill="var(--brand-primary)" opacity="0.9" />
                <circle cx="70" cy="70" r="32" stroke="var(--brand-primary)" stroke-width="1.5" opacity="0.55" />
                <circle cx="70" cy="70" r="50" stroke="var(--brand-secondary)" stroke-width="1.25" opacity="0.32" />
                <circle cx="70" cy="70" r="68" stroke="var(--brand-accent)" stroke-width="1" opacity="0.16" />
              </svg>
              <div class="conv-placeholder-title">Select a conversation</div>
              <div class="conv-placeholder-sub">Every voice comes back answered.</div>
            </div>
          } @else {
            <header class="conv-detail-head">
              <div class="conv-detail-id">
                <span class="conv-dot" [ngClass]="'conv-dot--' + selected()!.status"></span>
                <div>
                  <div class="conv-detail-phone">{{ maskPhone(selected()!.customerPhone) }}</div>
                  <div class="conv-detail-meta">
                    @if (selected()!.assignedAgent) {
                      Assigned to <strong>{{ selected()!.assignedAgent }}</strong>
                    } @else {
                      <span class="conv-unassigned">Unassigned</span>
                    }
                  </div>
                </div>
              </div>
              <div class="conv-detail-actions">
                <div class="conv-mode-toggle" role="group" aria-label="Reply mode">
                  <button
                    class="conv-mode-btn conv-mode-btn--ai"
                    [class.conv-mode-btn--active]="mode() === 'ai'"
                    (click)="mode.set('ai')">⚡ AI</button>
                  <button
                    class="conv-mode-btn conv-mode-btn--human"
                    [class.conv-mode-btn--active]="mode() === 'human'"
                    (click)="mode.set('human')">👤 Human</button>
                </div>
                <div class="conv-status-pills" role="group" aria-label="Conversation status">
                  @for (s of statusOptions; track s.key) {
                    <button
                      class="conv-status-pill"
                      [class.conv-status-pill--active]="selected()!.status === s.key"
                      [attr.aria-pressed]="selected()!.status === s.key"
                      [disabled]="statusUpdating()"
                      (click)="setStatus(s.key)">{{ s.label }}</button>
                  }
                </div>
                <button class="conv-back" (click)="select(null)" aria-label="Back to list">←</button>
              </div>
            </header>

            @if (messagesLoading()) {
              <!-- ── SKELETON: messages loading ─────────────────────── -->
              <div class="conv-thread conv-thread--skeleton" aria-busy="true" aria-label="Loading messages">
                @for (s of skeletonRows; track s.id) {
                  <div class="conv-skel-msg" [class.conv-skel-msg--out]="s.out">
                    <div class="conv-skel-bubble" [style.width.%]="s.w"></div>
                    <div class="conv-skel-line"></div>
                  </div>
                }
              </div>
            } @else if (messagesError()) {
              <!-- ── ERROR: fetch failed ────────────────────────────── -->
              <div class="conv-thread conv-thread--state">
                <div class="conv-error-card" role="alert">
                  <svg class="conv-error-ic" width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 8.5v4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    <circle cx="12" cy="16.4" r="1.15" fill="currentColor" />
                    <path d="M12 3.2 21 19H3L12 3.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                  </svg>
                  <div class="conv-error-title">Couldn't load messages</div>
                  <div class="conv-error-sub">Something went wrong fetching this conversation.</div>
                  <button class="conv-retry" (click)="retry()">Retry</button>
                </div>
              </div>
            } @else if (messages().length === 0) {
              <!-- ── EMPTY: no messages yet ─────────────────────────── -->
              <div class="conv-thread conv-thread--state">
                <div class="conv-empty-thread">
                  <svg class="conv-empty-ic" width="60" height="60" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <path d="M8 12a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20l-8 7v-7h0a4 4 0 0 1-4-4V12Z"
                          stroke="var(--brand-secondary)" stroke-width="2" stroke-linejoin="round" opacity="0.9" />
                    <circle cx="18" cy="20" r="1.6" fill="var(--brand-primary)" />
                    <circle cx="24" cy="20" r="1.6" fill="var(--brand-primary)" />
                    <circle cx="30" cy="20" r="1.6" fill="var(--brand-primary)" />
                  </svg>
                  <div class="conv-empty-title">No messages yet</div>
                  <div class="conv-empty-sub">Start the conversation below.</div>
                </div>
              </div>
            } @else {
              <!-- ── READY: message thread ──────────────────────────── -->
              <div class="conv-thread">
                @for (m of messages(); track m.id; let i = $index) {
                  <div
                    class="conv-msg"
                    [class.conv-msg--out]="m.from === 'ai' || m.from === 'human'"
                    [class.conv-msg--ai]="m.from === 'ai'"
                    [class.conv-msg--human]="m.from === 'human'">
                    @if ((m.from === 'ai' || m.from === 'human') && (i === 0 || messages()[i - 1].from !== m.from)) {
                      <div class="conv-msg-label">{{ m.from === 'ai' ? 'AI Agent' : 'You' }}</div>
                    }
                    <div class="conv-bubble">
                      @if (m.from === 'ai') {
                        <span class="conv-ai-icon" aria-hidden="true">⚡</span>
                      }
                      <span class="conv-bubble-text">{{ m.body }}</span>
                    </div>
                    <div class="conv-msg-time">{{ timeAgo(m.at) }}</div>
                  </div>
                }
              </div>
            }

            <div class="conv-composer">
              <textarea
                class="conv-composer-input"
                rows="1"
                [ngModel]="draft()"
                (ngModelChange)="draft.set($event)"
                (keydown)="onComposerKeydown($event)"
                [placeholder]="mode() === 'human' ? 'Replying as human agent…' : 'Type a reply…'"></textarea>
              <button class="conv-send" [disabled]="!draft().trim() || messagesLoading()" (click)="send()">Send</button>
            </div>
          }
        </section>
      </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    ion-content { --background: var(--app-bg); }

    .conv-shell {
      display: flex;
      height: 100%;
      background: var(--app-bg);
    }

    /* ── LEFT LIST ────────────────────────────────────────────── */
    .conv-list {
      width: 320px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      border-right: 1px solid var(--border);
      min-height: 0;
    }
    .conv-list-head { padding: 20px 16px 8px; }
    .conv-title {
      font-family: var(--font-display);
      font-size: 24px; font-weight: 700; letter-spacing: -0.5px;
      color: var(--admin-text); margin: 0 0 14px;
    }

    .conv-search { position: relative; margin-bottom: 12px; }
    .conv-search-ic {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--admin-text-muted); pointer-events: none;
    }
    .conv-search-input {
      width: 100%; box-sizing: border-box;
      padding: 9px 12px 9px 32px;
      background: var(--app-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--admin-text);
      font-family: var(--font-body); font-size: 14px;
      outline: none; transition: border-color .15s;
    }
    .conv-search-input::placeholder { color: var(--admin-text-muted); }
    .conv-search-input:focus { border-color: var(--brand-primary); }

    .conv-tabs { display: flex; gap: 4px; }
    .conv-tab {
      flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      padding: 6px 4px;
      background: transparent; border: none; border-radius: var(--radius-sm);
      color: var(--admin-text-secondary);
      font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
      cursor: pointer; transition: background .15s, color .15s;
    }
    .conv-tab:hover { color: var(--admin-text); background: var(--surface-2); }
    .conv-tab--active { color: #fff; background: var(--brand-primary); }
    .conv-tab-count {
      font-size: 10px; font-weight: 700; line-height: 1;
      padding: 2px 5px; border-radius: var(--radius-full);
      background: rgba(255,255,255,0.16);
    }
    .conv-tab:not(.conv-tab--active) .conv-tab-count {
      background: var(--surface-2); color: var(--admin-text-secondary);
    }

    .conv-cards {
      flex: 1; overflow-y: auto; padding: 6px 8px 16px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .conv-card {
      display: flex; gap: 10px; align-items: flex-start;
      width: 100%; text-align: left;
      padding: 11px 10px;
      background: transparent; border: none; border-radius: var(--radius-md);
      cursor: pointer; transition: background .12s;
      border-left: 2px solid transparent;
    }
    .conv-card:hover { background: var(--surface-2); }
    .conv-card--active {
      background: rgba(76,79,224,0.14);
      border-left-color: var(--brand-primary);
    }
    .conv-dot {
      width: 9px; height: 9px; border-radius: 50%; margin-top: 5px; flex-shrink: 0;
    }
    .conv-dot--open { background: var(--status-live); box-shadow: 0 0 0 3px rgba(52,211,153,0.15); }
    .conv-dot--pending { background: var(--status-warn); box-shadow: 0 0 0 3px rgba(255,177,60,0.15); }
    .conv-dot--resolved { background: var(--admin-text-muted); }
    .conv-dot--closed { background: var(--admin-text-muted); opacity: 0.5; }

    .conv-card-body { flex: 1; min-width: 0; }
    .conv-card-row {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .conv-card-row + .conv-card-row { margin-top: 3px; }
    .conv-card-phone {
      font-family: var(--font-mono); font-size: 13.5px; font-weight: 600;
      color: var(--admin-text); white-space: nowrap;
    }
    .conv-card-time {
      font-size: 11px; color: var(--admin-text-muted); white-space: nowrap; flex-shrink: 0;
    }
    .conv-card-preview {
      font-size: 12.5px; color: var(--admin-text-secondary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .conv-unread {
      flex-shrink: 0; min-width: 18px; height: 18px; padding: 0 5px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; line-height: 1;
      color: #fff;
      background: var(--brand-secondary, #14B8A6);   /* Teal */
      border-radius: var(--radius-full);
      box-shadow: 0 0 0 3px rgba(20,184,166,0.14);
    }

    /* ── UNREAD LIST ITEM ─────────────────────────────────────── */
    /* Bolder name + preview so unread threads read as "new" at a glance. */
    .conv-card--unread .conv-card-phone { font-weight: 700; }
    .conv-card--unread .conv-card-preview {
      color: var(--admin-text); font-weight: 600;
    }
    .conv-empty-list {
      padding: 32px 12px; text-align: center;
      font-size: 13px; color: var(--admin-text-muted);
    }
    .conv-retry--sm {
      display: block; margin: 12px auto 0; padding: 7px 16px; font-size: 12.5px;
    }

    /* ── RIGHT DETAIL ─────────────────────────────────────────── */
    .conv-detail {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column;
      background: var(--app-bg);
    }

    .conv-placeholder {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 6px;
      padding: 24px; text-align: center;
    }
    .echo-ring { margin-bottom: 14px; animation: echo-pulse 4s ease-in-out infinite; }
    @keyframes echo-pulse {
      0%, 100% { opacity: 0.85; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.03); }
    }
    .conv-placeholder-title {
      font-family: var(--font-display); font-size: 18px; font-weight: 600;
      color: var(--admin-text);
    }
    .conv-placeholder-sub { font-size: 13.5px; color: var(--admin-text-muted); }

    .conv-detail-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 22px; gap: 12px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .conv-detail-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .conv-detail-id .conv-dot { margin-top: 0; width: 10px; height: 10px; }
    .conv-detail-phone {
      font-family: var(--font-mono); font-size: 16px; font-weight: 700;
      color: var(--admin-text);
    }
    .conv-detail-meta { font-size: 12.5px; color: var(--admin-text-secondary); margin-top: 2px; }
    .conv-detail-meta strong { color: var(--brand-secondary); font-weight: 600; }
    .conv-unassigned { color: var(--admin-text-muted); }

    .conv-detail-actions { display: flex; align-items: center; gap: 10px; }
    .conv-badge {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      padding: 4px 10px; border-radius: var(--radius-full);
    }
    .conv-badge--open { color: var(--status-live); background: rgba(52,211,153,0.14); }
    .conv-badge--pending { color: var(--status-warn); background: rgba(255,177,60,0.14); }
    .conv-badge--resolved { color: var(--admin-text-secondary); background: var(--surface-2); }

    /* ── STATUS TRIAGE PILLS ──────────────────────────────────── */
    .conv-status-pills {
      display: inline-flex; align-items: center; gap: 2px;
      padding: 2px; border-radius: var(--radius-full);
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .conv-status-pill {
      padding: 5px 11px; border: none; border-radius: var(--radius-full);
      background: transparent; cursor: pointer;
      font-family: var(--font-body); font-size: 11.5px; font-weight: 600;
      letter-spacing: 0.2px;
      color: var(--admin-text-secondary);
      transition: background .15s, color .15s;
    }
    .conv-status-pill:hover:not(:disabled) { color: var(--admin-text); }
    .conv-status-pill--active {
      background: var(--brand-secondary, #14B8A6); color: #fff;   /* Teal */
    }
    .conv-status-pill:disabled { cursor: default; opacity: 0.75; }
    .conv-back {
      display: none;
      width: 34px; height: 34px; border-radius: var(--radius-md);
      background: var(--surface-2); border: 1px solid var(--border);
      color: var(--admin-text); font-size: 17px; cursor: pointer;
    }

    .conv-thread {
      flex: 1; overflow-y: auto;
      padding: 22px; display: flex; flex-direction: column; gap: 14px;
    }
    .conv-msg { max-width: 68%; align-self: flex-start; }
    .conv-msg--out { align-self: flex-end; }
    .conv-bubble {
      padding: 10px 14px; border-radius: 14px;
      font-size: 14px; line-height: 1.45; color: var(--admin-text-body);
      background: var(--surface); border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }
    .conv-msg--out .conv-bubble {
      color: #fff; background: var(--brand-primary); border-color: var(--brand-primary);
      border-bottom-left-radius: 14px; border-bottom-right-radius: 4px;
    }

    /* ── AI vs HUMAN attribution ──────────────────────────────── */
    .conv-msg--ai .conv-bubble {
      background: rgba(99, 102, 241, 0.15);   /* Indigo 15% */
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: var(--admin-text);
      border-bottom-left-radius: 14px; border-bottom-right-radius: 4px;
    }
    .conv-msg--human .conv-bubble {
      background: var(--brand-primary);        /* solid Indigo */
      color: #fff;
      border-color: var(--brand-primary);
      border-bottom-left-radius: 14px; border-bottom-right-radius: 4px;
    }
    .conv-ai-icon {
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px; line-height: 1; margin-right: 5px;
      transform: translateY(0.5px);
      filter: drop-shadow(0 0 4px rgba(99, 102, 241, 0.45));
    }
    .conv-msg-label {
      font-size: 10px; font-weight: 600; letter-spacing: 0.2px;
      color: var(--admin-text-secondary);
      margin-bottom: 3px; text-align: right;
    }
    .conv-msg--ai .conv-msg-label { text-align: right; color: #6366F1; }

    .conv-msg-time {
      font-size: 10.5px; color: var(--admin-text-muted);
      margin-top: 4px; padding: 0 4px;
    }
    .conv-msg--out .conv-msg-time { text-align: right; }

    /* ── HANDOVER TOGGLE ──────────────────────────────────────── */
    .conv-mode-toggle {
      display: inline-flex; align-items: center; gap: 2px;
      padding: 2px; border-radius: var(--radius-full);
      background: var(--surface-2); border: 1px solid var(--border);
    }
    .conv-mode-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 11px; border: none; border-radius: var(--radius-full);
      background: transparent; cursor: pointer;
      font-family: var(--font-body); font-size: 12px; font-weight: 600;
      color: var(--admin-text-secondary);
      transition: background .15s, color .15s;
    }
    .conv-mode-btn:hover { color: var(--admin-text); }
    .conv-mode-btn--ai.conv-mode-btn--active {
      background: var(--brand-secondary, #14B8A6); color: #fff;   /* Teal */
    }
    .conv-mode-btn--human.conv-mode-btn--active {
      background: var(--brand-accent, #F59E0B); color: var(--ec-obsidian, #0E1020);  /* Amber */
    }

    .conv-composer {
      display: flex; align-items: flex-end; gap: 10px;
      padding: 14px 18px;
      border-top: 1px solid var(--border); background: var(--surface);
    }
    .conv-composer-input {
      flex: 1; resize: none; max-height: 120px;
      padding: 11px 14px; box-sizing: border-box;
      background: var(--app-bg); border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      color: var(--admin-text); font-family: var(--font-body); font-size: 14px;
      line-height: 1.4; outline: none; transition: border-color .15s;
    }
    .conv-composer-input::placeholder { color: var(--admin-text-muted); }
    .conv-composer-input:focus { border-color: var(--brand-primary); }
    .conv-send {
      flex-shrink: 0; padding: 11px 22px;
      background: var(--brand-primary); border: none; border-radius: var(--radius-lg);
      color: #fff; font-family: var(--font-body); font-size: 14px; font-weight: 600;
      cursor: pointer; transition: background .15s, opacity .15s;
    }
    .conv-send:hover:not(:disabled) { background: var(--brand-primary-deep); }
    .conv-send:disabled { opacity: 0.45; cursor: not-allowed; }

    /* ── STATE CONTAINERS (skeleton / empty / error) ──────────── */
    .conv-thread--state { align-items: center; justify-content: center; }

    /* ── SKELETON LOADER ──────────────────────────────────────── */
    .conv-skel-msg {
      max-width: 68%; align-self: flex-start;
      display: flex; flex-direction: column; gap: 6px;
    }
    .conv-skel-msg--out { align-self: flex-end; align-items: flex-end; }
    .conv-skel-bubble {
      height: 40px; min-width: 90px; border-radius: 14px;
      border-bottom-left-radius: 4px;
      background: linear-gradient(100deg,
        var(--surface-2) 30%, rgba(20,184,166,0.16) 50%, var(--surface-2) 70%);
      background-size: 220% 100%;
      animation: conv-skel-shimmer 1.4s ease-in-out infinite;
    }
    .conv-skel-msg--out .conv-skel-bubble {
      border-bottom-left-radius: 14px; border-bottom-right-radius: 4px;
      background: linear-gradient(100deg,
        var(--surface-2) 30%, rgba(99,102,241,0.20) 50%, var(--surface-2) 70%);
      background-size: 220% 100%;
    }
    .conv-skel-line {
      height: 9px; width: 44px; border-radius: 6px;
      background: var(--surface-2);
      animation: conv-skel-pulse 1.4s ease-in-out infinite;
    }
    @keyframes conv-skel-shimmer {
      0%   { background-position: 220% 0; }
      100% { background-position: -220% 0; }
    }
    @keyframes conv-skel-pulse {
      0%, 100% { opacity: 0.55; }
      50%      { opacity: 1; }
    }

    /* ── EMPTY THREAD STATE ───────────────────────────────────── */
    .conv-empty-thread {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 24px; text-align: center;
    }
    .conv-empty-ic { margin-bottom: 10px; }
    .conv-empty-title {
      font-family: var(--font-display); font-size: 17px; font-weight: 600;
      color: var(--admin-text);
    }
    .conv-empty-sub { font-size: 13.5px; color: var(--admin-text-muted); }

    /* ── ERROR STATE ──────────────────────────────────────────── */
    .conv-error-card {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      max-width: 320px; padding: 26px 24px; text-align: center;
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.32);
      border-radius: var(--radius-lg);
    }
    .conv-error-ic { color: var(--brand-accent, #F59E0B); margin-bottom: 6px; }
    .conv-error-title {
      font-family: var(--font-display); font-size: 16px; font-weight: 600;
      color: var(--admin-text);
    }
    .conv-error-sub { font-size: 13px; color: var(--admin-text-secondary); }
    .conv-retry {
      margin-top: 12px; padding: 9px 22px;
      background: var(--brand-primary); border: none; border-radius: var(--radius-lg);
      color: #fff; font-family: var(--font-body); font-size: 13.5px; font-weight: 600;
      cursor: pointer; transition: background .15s;
    }
    .conv-retry:hover { background: var(--brand-primary-deep); }

    /* ── RESPONSIVE (<768px) ──────────────────────────────────── */
    @media (max-width: 767px) {
      .conv-list { width: 100%; border-right: none; }
      .conv-list--hidden { display: none; }
      .conv-shell:not(.conv-shell--detail-open) .conv-detail { display: none; }
      .conv-back { display: inline-flex; align-items: center; justify-content: center; }
      .conv-msg { max-width: 82%; }
      /* Clear the fixed mobile menu FAB (top 12px, 42px tall) so headers aren't overlapped/clipped. */
      .conv-list-head { padding-top: 60px; }
      .conv-detail-head { padding-top: 60px; }
    }
  `],
})
export class ConversationsPage implements OnInit, OnDestroy {
  private readonly toast = inject(ToastService);
  private readonly api = inject(ConversationService);
  private readonly socket = inject(SocketService);
  private readonly host = inject(ElementRef<HTMLElement>);

  // ── Real-time (Socket.IO) ─────────────────────────────────────
  // The room currently joined (conversation:<id>) and the live subscription
  // to message:new. Both are torn down whenever the selected thread changes.
  private joinedRoom: string | null = null;
  private messageSub: Subscription | null = null;
  // Component-lifetime subscription to message:new for list-level unread
  // tracking — fires for conversations that are NOT the open thread.
  private listMessageSub: Subscription | null = null;

  readonly tabs: { key: ConvFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'pending', label: 'Pending' },
    { key: 'resolved', label: 'Resolved' },
  ];

  // Status triage options rendered as pills in the thread header.
  readonly statusOptions: { key: ConvStatus; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'pending', label: 'Pending' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
  ];

  readonly query = signal('');
  readonly filter = signal<ConvFilter>('all');
  readonly selectedId = signal<string | null>(null);
  readonly draft = signal('');
  readonly mode = signal<'ai' | 'human'>('ai');
  readonly statusUpdating = signal(false);

  // ── Thread state machine ──────────────────────────────────────
  // The real messaging service replaces the body of loadThread(); the
  // template already renders skeleton / empty / error / ready off these.
  readonly messages = signal<ThreadMessage[]>([]);
  readonly messagesLoading = signal(false);
  readonly messagesError = signal(false);

  // Skeleton placeholder rows (varied widths, alternating in/out).
  readonly skeletonRows = [
    { id: 's1', out: false, w: 62 },
    { id: 's2', out: true, w: 48 },
    { id: 's3', out: false, w: 74 },
    { id: 's4', out: true, w: 56 },
    { id: 's5', out: false, w: 40 },
  ];

  private loadSeq = 0;
  private localSeq = 0;

  // ── Conversation list state ───────────────────────────────────
  readonly conversations = signal<Conversation[]>([]);
  readonly listLoading = signal(false);
  readonly listError = signal(false);

  // ── Real-time unread badges ───────────────────────────────────
  // Map<conversationId, unread delta> accumulated from message:new events
  // that land while the conversation is NOT the open thread. Cleared when
  // the thread is selected. Rendered as a teal count badge on the list item.
  readonly unreadCounts = signal(new Map<string, number>());

  ngOnInit(): void {
    this.loadConversations();
    // Listen for the whole session so badges accrue on background threads,
    // independent of whichever conversation room is currently joined.
    this.listMessageSub = this.socket
      .on<MessageNewPayload>('message:new')
      .subscribe((payload) => this.onListMessage(payload));
  }

  /**
   * List-level handler for real-time messages. Ignores the open thread (that
   * is handled by onMessageNew, which appends to the visible thread) and, for
   * every other conversation, bumps its unread badge and refreshes the list
   * preview + ordering so the newest activity floats to the top.
   */
  private onListMessage(payload: MessageNewPayload): void {
    if (!payload?.message) return;
    const id = payload.conversationId;
    if (id === this.selectedId()) return;   // active thread handled elsewhere

    this.unreadCounts.update((m) => {
      const next = new Map(m);
      next.set(id, (next.get(id) ?? 0) + 1);
      return next;
    });

    const incoming = this.toThreadMessage(payload.message as ApiMessage);
    this.conversations.update((list) =>
      list.map((x) =>
        x.id === id ? { ...x, preview: incoming.body, lastMessageAt: incoming.at } : x,
      ),
    );
  }

  /** Total unread for a list item: on-load API count plus live deltas. */
  unreadFor(c: Conversation): number {
    return c.unreadCount + (this.unreadCounts().get(c.id) ?? 0);
  }

  /** Fetch the conversation list from the API and map into the view model. */
  loadConversations(): void {
    this.listError.set(false);
    this.listLoading.set(true);
    this.api.getConversations({ page: 1, limit: 50 }).subscribe({
      next: ({ data }) => {
        this.conversations.set(data.map((c) => this.toViewConversation(c)));
        this.listLoading.set(false);
      },
      error: () => {
        this.listLoading.set(false);
        this.listError.set(true);
      },
    });
  }

  /** Map an API conversation into the local list view model. */
  private toViewConversation(c: ApiConversation): Conversation {
    const status = this.normalizeStatus(c.status);
    const ts = c.lastMessageAt || c.updatedAt || c.createdAt;
    return {
      id: c.id,
      customerPhone: c.contact?.phone_number || 'Unknown',
      preview: c.lastMessage?.content || 'No messages yet',
      status,
      unreadCount: c.unreadCount ?? 0,
      assignedAgent: null,
      lastMessageAt: ts ? Date.parse(ts) : Date.now(),
    };
  }

  /** Backend statuses (open/pending/resolved/closed) map 1:1 to the view model. */
  private normalizeStatus(s: string): ConvStatus {
    if (s === 'open' || s === 'pending' || s === 'resolved' || s === 'closed') return s;
    return 'open';
  }

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.conversations()
      .filter(c => this.matchesFilter(c.status, f))
      .filter(c => !q || c.customerPhone.includes(q) || c.preview.toLowerCase().includes(q))
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  });

  readonly selected = computed(() =>
    this.conversations().find(c => c.id === this.selectedId()) ?? null,
  );

  /** Map an API message into the local thread view model. */
  private toThreadMessage(m: ApiMessage): ThreadMessage {
    return {
      id: m.id,
      from: m.direction === 'inbound' ? 'customer' : 'human',
      body: m.content || '',
      at: m.createdAt ? Date.parse(m.createdAt) : Date.now(),
    };
  }

  /** Load the message thread for a conversation from the API. */
  private loadThread(c: Conversation): void {
    const seq = ++this.loadSeq;
    this.messagesError.set(false);
    this.messagesLoading.set(true);
    this.messages.set([]);

    this.api.getMessages(c.id).subscribe({
      next: (list) => {
        if (seq !== this.loadSeq) return;   // a newer selection superseded this
        this.messages.set(list.map((m) => this.toThreadMessage(m)));
        this.messagesLoading.set(false);
      },
      error: () => {
        if (seq !== this.loadSeq) return;
        this.messagesLoading.set(false);
        this.messagesError.set(true);
      },
    });
  }

  retry(): void {
    const c = this.selected();
    if (c) this.loadThread(c);
  }

  /**
   * Triage: change a conversation's status from the thread header pills.
   * Optimistically updates the list (and, via `selected`, the header) so the
   * active pill flips instantly, then reconciles / rolls back on the API result.
   */
  setStatus(status: ConvStatus): void {
    const c = this.selected();
    if (!c || c.status === status || this.statusUpdating()) return;

    const prev = c.status;
    this.statusUpdating.set(true);
    this.conversations.update(list =>
      list.map(x => (x.id === c.id ? { ...x, status } : x)),
    );

    this.api.updateStatus(c.id, status).subscribe({
      next: () => {
        this.statusUpdating.set(false);
        this.toast.show(`Marked as ${status}`, 'success');
      },
      error: () => {
        // Roll back the optimistic change and surface the failure.
        this.conversations.update(list =>
          list.map(x => (x.id === c.id ? { ...x, status: prev } : x)),
        );
        this.statusUpdating.set(false);
        this.toast.show('Failed to update status', 'error');
      },
    });
  }

  /** Closed conversations fold into the Resolved tab; every status shows under All. */
  private matchesFilter(status: ConvStatus, f: ConvFilter): boolean {
    if (f === 'all') return true;
    if (f === 'resolved') return status === 'resolved' || status === 'closed';
    return status === f;
  }

  countFor(f: ConvFilter): number {
    return this.conversations().filter(c => this.matchesFilter(c.status, f)).length;
  }

  select(id: string | null): void {
    // Leave any previously joined room before switching threads.
    this.leaveRoom();

    this.selectedId.set(id);
    this.draft.set('');
    if (id) {
      this.conversations.update(list =>
        list.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c)),
      );
      // Clear the live unread badge for the thread we're opening.
      if (this.unreadCounts().has(id)) {
        this.unreadCounts.update(m => {
          const next = new Map(m);
          next.delete(id);
          return next;
        });
      }
      const c = this.conversations().find(x => x.id === id);
      if (c) {
        this.loadThread(c);
        this.joinRoom(id);
      }
    } else {
      this.messages.set([]);
      this.messagesLoading.set(false);
      this.messagesError.set(false);
    }
  }

  /** Join the conversation's Socket.IO room and start listening for new messages. */
  private joinRoom(conversationId: string): void {
    const room = `conversation:${conversationId}`;
    this.socket.join(room);
    this.joinedRoom = room;
    this.messageSub = this.socket
      .on<MessageNewPayload>('message:new')
      .subscribe((payload) => this.onMessageNew(payload));
  }

  /** Leave the current room (if any) and drop the message:new subscription. */
  private leaveRoom(): void {
    this.messageSub?.unsubscribe();
    this.messageSub = null;
    if (this.joinedRoom) {
      this.socket.leave(this.joinedRoom);
      this.joinedRoom = null;
    }
  }

  /**
   * Append a real-time message to the open thread. Ignores events for other
   * conversations and de-dupes against messages we already have (e.g. our own
   * optimistic send that the server echoes back over the socket).
   */
  private onMessageNew(payload: MessageNewPayload): void {
    if (!payload?.message || payload.conversationId !== this.selectedId()) return;
    const incoming = this.toThreadMessage(payload.message as ApiMessage);
    if (this.messages().some((m) => m.id === incoming.id)) return;
    this.messages.update((list) => [...list, incoming]);
    // Reflect the new message in the list preview + ordering.
    this.conversations.update((list) =>
      list.map((x) =>
        x.id === payload.conversationId
          ? { ...x, preview: incoming.body, lastMessageAt: incoming.at }
          : x,
      ),
    );
    this.scrollToBottom();
  }

  /** Scroll the message thread to the latest message after the DOM settles. */
  private scrollToBottom(): void {
    setTimeout(() => {
      const thread = this.host.nativeElement.querySelector('.conv-thread');
      if (thread) thread.scrollTop = thread.scrollHeight;
    });
  }

  ngOnDestroy(): void {
    this.leaveRoom();
    this.listMessageSub?.unsubscribe();
    this.listMessageSub = null;
  }

  /** Enter submits; Shift+Enter inserts a newline. */
  onComposerKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.draft().trim();
    const c = this.selected();
    if (!text || this.messagesLoading() || !c) return;

    // Optimistic append — attribute to the active reply mode, then POST and
    // reconcile the optimistic entry with the server-created message.
    const tempId = `local-${++this.localSeq}`;
    const optimistic: ThreadMessage = {
      id: tempId,
      from: this.mode() === 'human' ? 'human' : 'ai',
      body: text,
      at: Date.now(),
    };
    this.messages.update(list => [...list, optimistic]);
    this.draft.set('');

    this.api.sendMessage(c.id, text).subscribe({
      next: (created) => {
        const real = this.toThreadMessage(created);
        this.messages.update(list => list.map(m => (m.id === tempId ? real : m)));
        // Reflect the new outbound message in the list preview.
        this.conversations.update(list =>
          list.map(x => (x.id === c.id ? { ...x, preview: text, lastMessageAt: real.at } : x)),
        );
        this.toast.show('Message sent', 'success');
      },
      error: () => {
        // Roll back the optimistic message and surface the failure.
        this.messages.update(list => list.filter(m => m.id !== tempId));
        this.draft.set(text);
        this.toast.show('Failed to send message', 'error');
      },
    });
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
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  }
}
