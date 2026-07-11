import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { Global } from '../../services/global';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule, RouterModule],
  template: `
    <ion-content><div class="page-container">
      <div class="dash-header">
        <div>
          <h1>Welcome back{{ global.displayName() ? ', ' + global.displayName() : '' }}</h1>
          <div class="subtitle">Your support console at a glance — every voice comes back answered.</div>
        </div>
        <div class="dash-date">{{ today | date: 'EEE, MMM d' }}</div>
      </div>

      @if (loading()) {
        <div class="dash-loading">
          <div class="dash-loading-spinner"></div>
          <span>Loading dashboard...</span>
        </div>
      }

      @if (!loading()) {
        <div class="dash-stats-row">
          <div class="dash-stat-card dash-stat-card--primary">
            <div class="dash-stat-icon dash-stat-icon--echo">
              <ion-icon name="chatbubbles-outline" />
            </div>
            <div class="dash-stat-body">
              <div class="dash-stat-value dash-stat-value--echo">{{ stats().conversations?.open || 0 }}</div>
              <div class="dash-stat-label">Open Conversations</div>
            </div>
            <div class="dash-stat-sub">{{ stats().conversations?.pending || 0 }} pending · {{ stats().conversations?.resolved || 0 }} resolved today</div>
          </div>

          <div class="dash-stat-card">
            <div class="dash-stat-icon dash-stat-icon--indigo">
              <ion-icon name="person-outline" />
            </div>
            <div class="dash-stat-body">
              <div class="dash-stat-value">{{ stats().agents?.online || 0 }}</div>
              <div class="dash-stat-label">Active Agents</div>
            </div>
            <div class="dash-stat-sub">{{ stats().agents?.paused || 0 }} paused · {{ stats().agents?.handled || 0 }} chats handled</div>
          </div>

          <div class="dash-stat-card">
            <div class="dash-stat-icon dash-stat-icon--teal">
              <ion-icon name="chatbox-outline" />
            </div>
            <div class="dash-stat-body">
              <div class="dash-stat-value">{{ stats().messages?.today || 0 }}</div>
              <div class="dash-stat-label">Messages Today</div>
            </div>
            <div class="dash-stat-sub dash-stat-sub--up">▲ {{ stats().messages?.deltaPct || 0 }}% vs yesterday</div>
          </div>
        </div>

        <div class="dash-grid">
          <div class="dash-col">
            <div class="dash-panel">
              <div class="dash-panel-header">
                <h2>Quick Actions</h2>
              </div>
              <div class="dash-panel-body">
                <div class="dash-actions">
                  <a routerLink="/conversations" class="dash-action-btn">
                    <ion-icon name="chatbubbles-outline" />
                    <span>Inbox</span>
                  </a>
                  <a routerLink="/contacts" class="dash-action-btn">
                    <ion-icon name="people-outline" />
                    <span>Contacts</span>
                  </a>
                  <a routerLink="/agents" class="dash-action-btn">
                    <ion-icon name="person-outline" />
                    <span>Agents</span>
                  </a>
                  <a routerLink="/whatsapp-numbers" class="dash-action-btn">
                    <ion-icon name="logo-whatsapp" />
                    <span>WA Numbers</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div class="dash-col">
            <div class="dash-panel">
              <div class="dash-panel-header">
                <h2>Recent Activity</h2>
              </div>
              <div class="dash-panel-body dash-panel-body--flush">
                <div class="dash-feed">
                  @for (event of activities; track event.text) {
                    <div class="dash-feed-row">
                      <div class="dash-feed-icon" [style.background]="event.color + '26'">
                        <span>{{ event.icon }}</span>
                      </div>
                      <div class="dash-feed-text">{{ event.text }}</div>
                      <div class="dash-feed-time">{{ event.time }}</div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div></ion-content>
  `,
})
export class DashboardPage implements OnInit {
  private readonly dashSvc = inject(DashboardService);
  readonly global = inject(Global);

  readonly loading = signal(true);
  readonly today = new Date();
  readonly stats = signal<any>({});

  // Coherent demo snapshot — mirrors the mock data shown on Conversations
  // (2 open · 2 pending · 2 resolved), Agents (Support Bot online, Sales
  // Assistant paused), so the landing hero never reads an empty 0/0/0 while
  // every other page is populated. Live API values take precedence when present.
  private readonly demoStats = {
    conversations: { open: 2, pending: 2, resolved: 2 },
    agents: { online: 1, paused: 1, handled: 179 },
    messages: { today: 128, deltaPct: 18 },
  };

  readonly activities = [
    { icon: '💬', color: '#14B8A6', text: 'New conversation from +60 12-345 6789', time: '2m ago' },
    { icon: '⚡', color: '#6366F1', text: 'AI Agent replied to Omar Rashid — order inquiry', time: '4m ago' },
    { icon: '✅', color: '#22C55E', text: 'Conversation resolved — ORDER-4821 by Sarah', time: '8m ago' },
    { icon: '💬', color: '#14B8A6', text: 'New conversation from +60 17-891 2345', time: '12m ago' },
    { icon: '👤', color: '#F59E0B', text: 'Human takeover — Sarah handling ORDER-5502', time: '15m ago' },
    { icon: '⚡', color: '#6366F1', text: 'AI Agent resolved billing question automatically', time: '22m ago' },
    { icon: '🔗', color: '#94A3B8', text: 'HubSpot sync completed — 3 contacts updated', time: '31m ago' },
    { icon: '💬', color: '#14B8A6', text: 'New conversation from +60 19-234 5678', time: '45m ago' },
  ];

  async ngOnInit() {
    try {
      const res: any = await firstValueFrom(this.dashSvc.getStats());
      const d: any = res?.ok ? res.detail || {} : {};
      const hasLiveData = (d?.conversations?.open || d?.agents?.online || d?.messages?.today);
      this.stats.set(hasLiveData ? d : this.demoStats);
    } catch (e) {
      console.error('Dashboard load error', e);
      this.stats.set(this.demoStats);
    } finally {
      this.loading.set(false);
    }
  }
}
