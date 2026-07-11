import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';
import { CustomerService } from '../../services/customer.service';
import { exportToExcel } from '../../shared/excel-export';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonContent, IonIcon, TableModule, DialogModule, ButtonModule, InputTextModule],
  template: `
    <ion-content><div class="page-container">
      <div class="page-header">
        <div>
          <h1>Customers</h1>
          <div class="subtitle">Manage customer accounts</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" (click)="exportCsv()" title="Export CSV"><ion-icon name="download-outline" /> Export</button>
          <button class="btn-primary" (click)="showAddDialog.set(true)">+ Add Customer</button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-toolbar">
          <h2>All Customers ({{ total() }})</h2>
          <input class="search-input" placeholder="Search customers..." [formControl]="searchCtrl" />
        </div>
        <p-table [value]="customers()" [rows]="pageSize">
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-c>
            <tr>
              <td><strong>{{ c.displayName }}</strong></td>
              <td>{{ c.email }}</td>
              <td>{{ c.phoneNumber || '—' }}</td>
              <td><span class="badge" [ngClass]="c.status === 'active' ? 'badge-active' : 'badge-inactive'">{{ c.status }}</span></td>
              <td>{{ c.createdAt | date: 'MMM d, yyyy' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">No customers found</td></tr>
          </ng-template>
        </p-table>
        <div class="pagination-nav">
          <button class="btn-secondary" [disabled]="cursorStack().length === 0" (click)="prevPage()">Previous</button>
          <span>{{ customers().length ? cursorStack().length * pageSize + 1 : 0 }}–{{ cursorStack().length * pageSize + customers().length }} of {{ total() }}</span>
          <button class="btn-secondary" [disabled]="!nextCursor()" (click)="nextPage()">Next</button>
        </div>
      </div>

      <p-dialog header="Add Customer" [(visible)]="showAddDialogValue" [modal]="true" [draggable]="false" [resizable]="false" [style]="{width: '420px'}">
        <form [formGroup]="addForm">
          <div class="form-field">
            <label>Display Name</label>
            <input pInputText formControlName="displayName" placeholder="Full name" style="width: 100%;" />
          </div>
          <div class="form-field" style="margin-top: 12px;">
            <label>Email</label>
            <input pInputText formControlName="email" placeholder="Email address" style="width: 100%;" />
          </div>
          <div class="form-field" style="margin-top: 12px;">
            <label>Phone</label>
            <input pInputText formControlName="phoneNumber" placeholder="Phone number" style="width: 100%;" />
          </div>
        </form>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" (onClick)="showAddDialog.set(false)" />
          <p-button label="Create" (onClick)="createCustomer()" [disabled]="addForm.invalid" />
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
export class CustomerListPage implements OnInit {
  private readonly customerSvc = inject(CustomerService);

  readonly customers = signal<any[]>([]);
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
    phoneNumber: new FormControl(''),
  });

  get showAddDialogValue() { return this.showAddDialog(); }
  set showAddDialogValue(v: boolean) { this.showAddDialog.set(v); }

  async ngOnInit() {
    this.searchCtrl.valueChanges.subscribe(() => this.resetAndLoad());
    await this.loadCustomers();
  }

  async loadCustomers() {
    try {
      const params: any = { limit: this.pageSize };
      if (this.currentCursor) params.cursor = this.currentCursor;
      const search = (this.searchCtrl.value || '').trim();
      if (search) params.search = search;
      const res: any = await firstValueFrom(this.customerSvc.getCustomers(params));
      if (res?.ok) {
        this.customers.set(res.list || []);
        this.total.set(res.totalCount || 0);
        this.nextCursor.set(res.nextCursor || null);
      }
    } catch (e) {
      console.error('Failed to load customers', e);
    }
  }

  async nextPage() {
    const nc = this.nextCursor();
    if (!nc) return;
    this.cursorStack.update(s => [...s, this.customers()[0]?.id]);
    this.currentCursor = nc;
    await this.loadCustomers();
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
    await this.loadCustomers();
  }

  private async resetAndLoad() {
    this.currentCursor = undefined;
    this.cursorStack.set([]);
    await this.loadCustomers();
  }

  exportCsv() {
    const data = this.customers().map(c => ({
      'Name': c.displayName,
      'Email': c.email,
      'Phone': c.phoneNumber || '',
      'Status': c.status,
      'Created': new Date(c.createdAt).toLocaleDateString(),
    }));
    exportToExcel(data, 'customers');
  }

  async createCustomer() {
    if (this.addForm.invalid) return;
    try {
      const res: any = await firstValueFrom(this.customerSvc.createCustomer(this.addForm.getRawValue()));
      if (res?.ok) {
        this.showAddDialog.set(false);
        this.addForm.reset();
        await this.resetAndLoad();
      }
    } catch (e) {
      console.error('Failed to create customer', e);
    }
  }
}
