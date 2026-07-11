import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ── API shape (as returned by the Echora backend) ────────────────────────────
export interface WhatsappNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  wabaId: string | null;
  phoneNumberId: string | null;
  isActive: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsappNumberCreate {
  phoneNumber: string;
  displayName: string;
  wabaId?: string;         // Business Account ID (aliased server-side as businessAccountId)
  phoneNumberId?: string;
}

export interface WhatsappNumberUpdate {
  phoneNumber?: string;
  displayName?: string;
  wabaId?: string;
  phoneNumberId?: string;
  isActive?: boolean;
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
export class WhatsAppNumberService {
  private readonly http = inject(HttpClient);

  // environment.apiUrl is the admin base (…/company). WhatsApp-number endpoints
  // live at the host root under /api/v1, so strip the trailing /company segment.
  private readonly base = `${environment.apiUrl.replace(/\/company\/?$/, '')}/api/v1/whatsapp-numbers`;

  getNumbers(): Observable<WhatsappNumber[]> {
    return this.http
      .get<ListResponse<WhatsappNumber>>(this.base)
      .pipe(map((res) => res.data || []), catchError(this.handleError));
  }

  createNumber(data: WhatsappNumberCreate): Observable<WhatsappNumber> {
    return this.http
      .post<DetailResponse<WhatsappNumber>>(this.base, data)
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  updateNumber(id: string, data: WhatsappNumberUpdate): Observable<WhatsappNumber> {
    return this.http
      .patch<DetailResponse<WhatsappNumber>>(`${this.base}/${id}`, data)
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  toggleNumber(id: string): Observable<WhatsappNumber> {
    return this.http
      .patch<DetailResponse<WhatsappNumber>>(`${this.base}/${id}/toggle`, {})
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  deleteNumber(id: string): Observable<void> {
    return this.http
      .delete<DetailResponse<{ id: string; deleted: boolean }>>(`${this.base}/${id}`)
      .pipe(map(() => void 0), catchError(this.handleError));
  }

  private handleError(error: any) {
    const message = error?.error?.message || error?.message || 'An error occurred';
    return throwError(() => ({ message, status: error?.status }));
  }
}
