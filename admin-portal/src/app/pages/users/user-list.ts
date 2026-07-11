import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../services/user.service';
import { exportToExcel } from '../../shared/excel-export';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonContent, IonIcon, TableModule, DialogModule, ButtonModule, InputTextModule],
  template: `
    <ion-content><div class="page-container">
      <div class="page-header">
        <div>
          <h1>Users</h1>
          <div class="subtitle">Manage admin and staff accounts</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" (click)="exportCsv()" title="Export CSV"><ion-icon name="download-outline" /> Export</button>
          <button class="btn-primary" (click)="showAddDialog.set(true)">+ Add User</button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-toolbar">
          <h2>All Users ({{ total() }})</h2>
          <input class="search-input" placeholder="Search users..." [formControl]="searchCtrl" />
        </div>
        <p-table [value]="users()" [rows]="pageSize">
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-user>
            <tr>
              <td><strong>{{ user.displayName }}</strong></td>
              <td>{{ user.email }}</td>
              <td><span class="badge" [ngClass]="user.role === 'admin' ? 'badge-active' : 'badge-pending'">{{ user.role }}</span></td>
              <td><span class="badge" [ngClass]="user.isActive ? 'badge-active' : 'badge-inactive'">{{ user.isActive ? 'active' : 'inactive' }}</span></td>
              <td>{{ user.createdAt | date: 'MMM d, yyyy' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">No users found</td></tr>
          </ng-template>
        </p-table>
        <div class="pagination-nav">
          <button class="btn-secondary" [disabled]="cursorStack().length === 0" (click)="prevPage()">Previous</button>
          <span>{{ users().length ? cursorStack().length * pageSize + 1 : 0 }}–{{ cursorStack().length * pageSize + users().length }} of {{ total() }}</span>
          <button class="btn-secondary" [disabled]="!nextCursor()" (click)="nextPage()">Next</button>
        </div>
      </div>

      <p-dialog header="Add User" [(visible)]="showAddDialogValue" [modal]="true" [draggable]="false" [resizable]="false" [style]="{width: '420px'}">
        <form [formGroup]="addForm">
          <div class="form-field">
            <label>Display Name</label>
            <input pInputText formControlName="displayName" placeholder="Full name" style="width: 100%;" />
          </div>
          <div class="form-field" style="margin-top: 12px;">
            <label>Email</label>
            <input pInputText formControlName="email" placeholder="Email" style="width: 100%;" />
          </div>
          <div class="form-field" style="margin-top: 12px;">
            <label>Password</label>
            <input pInputText type="password" formControlName="password" placeholder="Password" style="width: 100%;" />
          </div>
        </form>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" (onClick)="showAddDialog.set(false)" />
          <p-button label="Create" (onClick)="createUser()" [disabled]="addForm.invalid" />
        </ng-template>
      </p-dialog>
    </div></ion-content>
  `,
  styles: [`
    .form-field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--admin-text-secondary);
      margin-bottom: 6px;
    }
    .pagination-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 12px 0;
      font-size: 13px;
      color: var(--admin-text-secondary);
    }
  `],
})
export class UserListPage implements OnInit {
  private readonly userSvc = inject(UserService);

  readonly users = signal<any[]>([]);
  readonly total = signal(0);
  readonly nextCursor = signal<number | null>(null);
  readonly cursorStack = signal<number[]>([]);
  readonly showAddDialog = signal(false);
  readonly searchCtrl = new FormControl('');
  readonly pageSize = 20;
  private currentCursor: number | undefined;

  readonly addForm = new FormGroup({
    displayName: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  get showAddDialogValue() { return this.showAddDialog(); }
  set showAddDialogValue(v: boolean) { this.showAddDialog.set(v); }

  async ngOnInit() {
    this.searchCtrl.valueChanges.subscribe(() => this.resetAndLoad());
    await this.loadUsers();
  }

  async loadUsers() {
    try {
      const params: any = { limit: this.pageSize };
      if (this.currentCursor) params.cursor = this.currentCursor;
      const search = (this.searchCtrl.value || '').trim();
      if (search) params.search = search;
      const res: any = await firstValueFrom(this.userSvc.getUsers(params));
      if (res?.ok) {
        this.users.set(res.list || []);
        this.total.set(res.totalCount || 0);
        this.nextCursor.set(res.nextCursor || null);
      }
    } catch (e) {
      console.error('Failed to load users', e);
    }
  }

  async nextPage() {
    const nc = this.nextCursor();
    if (!nc) return;
    this.cursorStack.update(s => [...s, this.users()[0]?.id]);
    this.currentCursor = nc;
    await this.loadUsers();
  }

  async prevPage() {
    const stack = this.cursorStack();
    if (stack.length === 0) return;
    const prevFirst = stack[stack.length - 1];
    this.cursorStack.update(s => s.slice(0, -1));
    if (this.cursorStack().length === 0) {
      this.currentCursor = undefined;
    } else {
      this.currentCursor = prevFirst;
    }
    await this.loadUsers();
  }

  private async resetAndLoad() {
    this.currentCursor = undefined;
    this.cursorStack.set([]);
    await this.loadUsers();
  }

  exportCsv() {
    const data = this.users().map(u => ({
      'Name': u.displayName,
      'Email': u.email,
      'Role': u.role,
      'Status': u.isActive ? 'active' : 'inactive',
      'Created': new Date(u.createdAt).toLocaleDateString(),
    }));
    exportToExcel(data, 'users');
  }

  async createUser() {
    if (this.addForm.invalid) return;
    try {
      const res: any = await firstValueFrom(this.userSvc.createUser(this.addForm.getRawValue()));
      if (res?.ok) {
        this.showAddDialog.set(false);
        this.addForm.reset();
        await this.resetAndLoad();
      }
    } catch (e) {
      console.error('Failed to create user', e);
    }
  }
}
