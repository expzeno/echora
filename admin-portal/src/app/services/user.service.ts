import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api-base.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = inject(ApiBaseService);

  getUsers(params?: { cursor?: number; limit?: number; search?: string }): Observable<any> {
    return this.api.get('/user/list', params);
  }

  createUser(data: any): Observable<any> {
    return this.api.post('/user/create', data);
  }

  updateUser(data: any): Observable<any> {
    return this.api.post('/user/update', data);
  }
}
