import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class MerchantService {
  private api = inject(ApiBaseService);

  getMerchants(params?: { cursor?: number; limit?: number; search?: string }): Observable<any> {
    return this.api.get('/merchant/list', params);
  }

  createMerchant(data: any): Observable<any> {
    return this.api.post('/merchant/create', data);
  }

  updateMerchant(id: number, data: any): Observable<any> {
    return this.api.post(`/merchant/${id}/update`, data);
  }
}
