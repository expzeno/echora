import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private api = inject(ApiBaseService);

  getCustomers(params?: { cursor?: number; limit?: number; search?: string }): Observable<any> {
    return this.api.get('/customer/list', params);
  }

  createCustomer(data: any): Observable<any> {
    return this.api.post('/customer/create', data);
  }

  updateCustomer(id: number, data: any): Observable<any> {
    return this.api.post(`/customer/${id}/update`, data);
  }
}
