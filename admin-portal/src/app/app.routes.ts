import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginPage),
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardPage) },
      { path: 'conversations', loadComponent: () => import('./pages/conversations/conversations').then(m => m.ConversationsPage) },
      { path: 'contacts', loadComponent: () => import('./pages/contacts/contacts').then(m => m.ContactsPage) },
      { path: 'agents', loadComponent: () => import('./pages/agents/agents').then(m => m.AgentsPage) },
      { path: 'quick-replies', loadComponent: () => import('./pages/quick-replies/quick-replies').then(m => m.QuickRepliesPage) },
      { path: 'whatsapp-numbers', loadComponent: () => import('./pages/whatsapp-numbers/whatsapp-numbers').then(m => m.WhatsAppNumbersPage) },
      { path: 'integrations', loadComponent: () => import('./pages/integrations/integrations').then(m => m.IntegrationsPage) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsPage) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
