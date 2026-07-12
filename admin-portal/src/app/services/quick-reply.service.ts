import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ── API shape (as returned by the Echora backend) ────────────────────────────
export interface QuickReply {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse<T> {
  ok: boolean;
  data: T[];
}

interface DetailResponse<T> {
  ok: boolean;
  detail: T;
}

@Injectable({ providedIn: 'root' })
export class QuickReplyService {
  private readonly http = inject(HttpClient);

  // environment.apiUrl is the admin base (…/company). Quick-reply endpoints live
  // at the host root under /api/v1, so strip the trailing /company segment.
  private readonly base = `${environment.apiUrl.replace(/\/company\/?$/, '')}/api/v1/quick-replies`;

  getQuickReplies(): Observable<QuickReply[]> {
    return this.http
      .get<ListResponse<QuickReply>>(this.base)
      .pipe(map((res) => res.data || []), catchError(this.handleError));
  }

  createQuickReply(title: string, body: string): Observable<QuickReply> {
    return this.http
      .post<DetailResponse<QuickReply>>(this.base, { title, body })
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  deleteQuickReply(id: number): Observable<void> {
    return this.http
      .delete<{ ok: boolean }>(`${this.base}/${id}`)
      .pipe(map(() => undefined), catchError(this.handleError));
  }

  private handleError(error: any) {
    const message = error?.error?.message || error?.message || 'An error occurred';
    return throwError(() => ({ message, status: error?.status }));
  }
}
