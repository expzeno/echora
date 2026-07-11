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
      { path: 'users', loadComponent: () => import('./pages/users/user-list').then(m => m.UserListPage) },
      { path: 'customers', loadComponent: () => import('./pages/customers/customer-list').then(m => m.CustomerListPage) },
      { path: 'merchants', loadComponent: () => import('./pages/merchants/merchant-list').then(m => m.MerchantListPage) },
      { path: 'tokens', loadComponent: () => import('./components/tokens-form/tokens-form').then(m => m.TokensFormComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
