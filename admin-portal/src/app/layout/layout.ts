import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonSplitPane, IonMenu, IonContent,
  IonItem, IonIcon, IonLabel, IonMenuToggle, IonRouterOutlet,
  MenuController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';
import { Preferences } from '@capacitor/preferences';
import { AuthService } from '../services/auth.service';
import { Global } from '../services/global';
import { ToastComponent } from '../components/toast/toast.component';
import { environment } from '../../environments/environment';

const DARK_MODE_KEY = 'ec_darkMode';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterLinkActive,
    IonSplitPane, IonMenu, IonContent,
    IonItem, IonIcon, IonLabel, IonMenuToggle, IonRouterOutlet,
    ToastComponent,
  ],
  template: `
    <ion-split-pane contentId="main-content" [when]="'md'">
      <ion-menu contentId="main-content" type="overlay" class="admin-sidebar" (ionDidOpen)="menuOpen = true" (ionDidClose)="menuOpen = false">
        <ion-content>
          <div class="sidebar-header">
            <img src="assets/image/logo.svg" class="logo-img" alt="Logo"
                 onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline-flex';" />
            <span class="logo-fallback" style="display:none;">Logo</span>
            <div>
              <span class="logo-text">Echora</span>
            </div>
          </div>

          <div class="sidebar-section">
            <div class="section-label">Overview</div>
            <ion-menu-toggle auto-hide="false">
              <ion-item class="sidebar-item" routerLink="/dashboard" routerLinkActive="selected" [routerLinkActiveOptions]="{exact: true}" lines="none">
                <ion-icon name="grid-outline" slot="start" />
                <ion-label>Dashboard</ion-label>
              </ion-item>
            </ion-menu-toggle>
          </div>

          <div class="sidebar-section">
            <div class="section-label">Management</div>
            @for (item of managementItems; track item.url) {
              @if (!item.adminOnly || global.isAdmin()) {
                <ion-menu-toggle auto-hide="false">
                  <ion-item class="sidebar-item" [routerLink]="item.url" routerLinkActive="selected" lines="none">
                    <ion-icon [name]="item.icon" slot="start" />
                    <ion-label>{{ item.label }}</ion-label>
                  </ion-item>
                </ion-menu-toggle>
              }
            }
          </div>

          @if (hasVisibleSystemItems) {
            <div class="sidebar-section">
              <div class="section-label">System</div>
              @for (item of systemItems; track item.url) {
                @if (!item.adminOnly || global.isAdmin()) {
                  <ion-menu-toggle auto-hide="false">
                    <ion-item class="sidebar-item" [routerLink]="item.url" routerLinkActive="selected" lines="none">
                      <ion-icon [name]="item.icon" slot="start" />
                      <ion-label>{{ item.label }}</ion-label>
                    </ion-item>
                  </ion-menu-toggle>
                }
              }
            </div>
          }

          <div class="sidebar-section" style="border-top: 1px solid var(--admin-border); margin-top: 8px; padding-top: 8px;">
            <ion-item class="sidebar-item" (click)="toggleDarkMode()" lines="none" style="cursor: pointer;">
              <ion-icon [name]="global.darkMode() ? 'sunny-outline' : 'moon-outline'" slot="start" />
              <ion-label>{{ global.darkMode() ? 'Light Mode' : 'Dark Mode' }}</ion-label>
            </ion-item>
            <ion-item class="sidebar-item" (click)="logout()" lines="none" style="cursor: pointer;">
              <ion-icon name="log-out-outline" slot="start" />
              <ion-label>Sign Out</ion-label>
            </ion-item>
          </div>
        </ion-content>
      </ion-menu>

      <ion-router-outlet id="main-content" />
    </ion-split-pane>

    <button class="mobile-menu-fab" (click)="toggleMenu()" type="button">
      <ion-icon [name]="menuOpen ? 'close-outline' : 'menu-outline'" />
    </button>

    <app-toast />
  `,
  styles: [`
    .mobile-menu-fab {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 1000;
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: var(--admin-surface);
      border: 1px solid var(--admin-border);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      color: var(--admin-text);
    }
    .mobile-menu-fab ion-icon { font-size: 24px; }
    @media (min-width: 768px) {
      .mobile-menu-fab { display: none; }
    }
  `],
})
export class LayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly menuCtrl = inject(MenuController);
  readonly global = inject(Global);

  readonly isProd = environment.production;
  menuOpen = false;

  managementItems = [
    { label: 'Conversations', url: '/conversations', icon: 'chatbubbles-outline', adminOnly: false },
    { label: 'Contacts', url: '/contacts', icon: 'people-outline', adminOnly: false },
    { label: 'Agents', url: '/agents', icon: 'person-outline', adminOnly: true },
    { label: 'Quick Replies', url: '/quick-replies', icon: 'flash-outline', adminOnly: true },
    { label: 'WhatsApp Numbers', url: '/whatsapp-numbers', icon: 'logo-whatsapp', adminOnly: true },
  ];

  systemItems = [
    { label: 'Integrations', url: '/integrations', icon: 'git-branch-outline', adminOnly: true },
    { label: 'Settings', url: '/settings', icon: 'settings-outline', adminOnly: true },
  ];

  get hasVisibleSystemItems(): boolean {
    return this.systemItems.some(i => !i.adminOnly || this.global.isAdmin());
  }

  constructor() {
    addIcons(allIcons);
  }

  async ngOnInit() {
    const { value } = await Preferences.get({ key: DARK_MODE_KEY });
    if (value === 'true') {
      this.global.darkMode.set(true);
      document.body.classList.add('dark-theme');
    }
  }

  async toggleMenu() {
    const isOpen = await this.menuCtrl.isOpen();
    if (isOpen) await this.menuCtrl.close();
    else await this.menuCtrl.open();
  }

  async toggleDarkMode() {
    const next = !this.global.darkMode();
    this.global.darkMode.set(next);
    await Preferences.set({ key: DARK_MODE_KEY, value: String(next) });
    document.body.classList.toggle('dark-theme', next);
  }

  logout() {
    this.auth.logout();
  }
}
