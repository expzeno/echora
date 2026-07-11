import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ── API shapes (as returned by the Echora backend) ───────────────────────────
export interface ConversationContact {
  name?: string | null;
  phone_number?: string | null;
}

export interface ConversationPreview {
  content: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  status: string;
  contact: ConversationContact | null;
  lastMessage?: ConversationPreview | null;
  unreadCount?: number;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  content: string | null;
  status?: string;
  createdAt: string;
  agentId?: string | null;
}

export interface ConversationListParams {
  page?: number;
  limit?: number;
  status?: string;
}

interface ListResponse<T> {
  ok: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface DetailResponse<T> {
  ok: boolean;
  detail: T;
}

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly http = inject(HttpClient);

  // environment.apiUrl is the admin base (…/company). Conversation endpoints live
  // at the host root under /api/v1, so strip the trailing /company segment.
  private readonly base = `${environment.apiUrl.replace(/\/company\/?$/, '')}/api/v1/conversations`;

  getConversations(params: ConversationListParams = {}): Observable<{ data: Conversation[]; total: number }> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);
    if (params.status) httpParams = httpParams.set('status', params.status);

    return this.http
      .get<ListResponse<Conversation>>(this.base, { params: httpParams })
      .pipe(
        map((res) => ({ data: res.data || [], total: res.total || 0 })),
        catchError(this.handleError),
      );
  }

  getConversation(id: string): Observable<Conversation> {
    return this.http
      .get<DetailResponse<Conversation>>(`${this.base}/${id}`)
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.http
      .get<ListResponse<Message>>(`${this.base}/${conversationId}/messages`, {
        params: new HttpParams().set('limit', 200),
      })
      .pipe(map((res) => res.data || []), catchError(this.handleError));
  }

  sendMessage(conversationId: string, content: string): Observable<Message> {
    return this.http
      .post<DetailResponse<Message>>(`${this.base}/${conversationId}/messages`, { content })
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  updateStatus(conversationId: string, status: string): Observable<Conversation> {
    return this.http
      .patch<DetailResponse<Conversation>>(`${this.base}/${conversationId}/status`, { status })
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  private handleError(error: any) {
    const message = error?.error?.message || error?.message || 'An error occurred';
    return throwError(() => ({ message, status: error?.status }));
  }
}
