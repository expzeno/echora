import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api-base.service';
import { TokenPayload, TokenSaveResponse } from '../models/tokens.model';

@Injectable({ providedIn: 'root' })
export class TokensService {
  private readonly api = inject(ApiBaseService);

  saveTokens(merchantId: string, payload: TokenPayload): Observable<TokenSaveResponse> {
    return this.api.post<TokenSaveResponse>(`/company/tokens/${merchantId}/save`, payload);
  }

  getTokens(merchantId: string): Observable<TokenSaveResponse & { item?: TokenPayload }> {
    return this.api.get(`/company/tokens/${merchantId}`);
  }
}
