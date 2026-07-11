import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = inject(ApiBaseService);

  getStats(): Observable<any> {
    return this.api.get('/dashboard/stats');
  }
}
