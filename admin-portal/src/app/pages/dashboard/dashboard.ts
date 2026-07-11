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
          <div class="subtitle">Here's what's happening on your platform today.</div>
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
            <div class="dash-stat-icon" style="background: #ede9fe; color: #7c3aed;">
              <ion-icon name="people-outline" />
            </div>
            <div class="dash-stat-body">
              <div class="dash-stat-value">{{ stats().users?.total || 0 }}</div>
              <div class="dash-stat-label">Total Users</div>
            </div>
          </div>

          <div class="dash-stat-card">
            <div class="dash-stat-icon" style="background: #dbeafe; color: #2563eb;">
              <ion-icon name="person-outline" />
            </div>
            <div class="dash-stat-body">
              <div class="dash-stat-value">{{ stats().customers?.total || 0 }}</div>
              <div class="dash-stat-label">Customers</div>
            </div>
          </div>

          <div class="dash-stat-card">
            <div class="dash-stat-icon" style="background: #d1fae5; color: #059669;">
              <ion-icon name="storefront-outline" />
            </div>
            <div class="dash-stat-body">
              <div class="dash-stat-value">{{ stats().merchants?.total || 0 }}</div>
              <div class="dash-stat-label">Merchants</div>
            </div>
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
                  <a routerLink="/users" class="dash-action-btn">
                    <ion-icon name="people-outline" />
                    <span>Users</span>
                  </a>
                  <a routerLink="/customers" class="dash-action-btn">
                    <ion-icon name="person-outline" />
                    <span>Customers</span>
                  </a>
                  <a routerLink="/merchants" class="dash-action-btn">
                    <ion-icon name="storefront-outline" />
                    <span>Merchants</span>
                  </a>
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

  async ngOnInit() {
    try {
      const res: any = await firstValueFrom(this.dashSvc.getStats());
      if (res?.ok) {
        this.stats.set(res.detail || {});
      }
    } catch (e) {
      console.error('Dashboard load error', e);
    } finally {
      this.loading.set(false);
    }
  }
}
