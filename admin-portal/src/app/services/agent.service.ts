import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ── API shape (as returned by the Echora backend) ────────────────────────────
export interface Agent {
  id: string;
  email?: string;
  displayName: string;
  role: string;          // agent | lead | admin
  status: string;        // active | suspended
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentCreate {
  email: string;
  displayName: string;
  role?: string;
  status?: string;
}

export interface AgentUpdate {
  displayName?: string;
  role?: string;
  status?: string;
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
export class AgentService {
  private readonly http = inject(HttpClient);

  // environment.apiUrl is the admin base (…/company). Agent endpoints live at the
  // host root under /api/v1, so strip the trailing /company segment.
  private readonly base = `${environment.apiUrl.replace(/\/company\/?$/, '')}/api/v1/agents`;

  getAgents(): Observable<Agent[]> {
    return this.http
      .get<ListResponse<Agent>>(this.base)
      .pipe(map((res) => res.data || []), catchError(this.handleError));
  }

  createAgent(data: AgentCreate): Observable<Agent> {
    return this.http
      .post<DetailResponse<Agent>>(this.base, data)
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  updateAgent(id: string, data: AgentUpdate): Observable<Agent> {
    return this.http
      .patch<DetailResponse<Agent>>(`${this.base}/${id}`, data)
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  toggleAgent(id: string): Observable<Agent> {
    return this.http
      .patch<DetailResponse<Agent>>(`${this.base}/${id}/toggle`, {})
      .pipe(map((res) => res.detail), catchError(this.handleError));
  }

  deleteAgent(id: string): Observable<void> {
    return this.http
      .delete<DetailResponse<{ id: string; deleted: boolean }>>(`${this.base}/${id}`)
      .pipe(map(() => void 0), catchError(this.handleError));
  }

  private handleError(error: any) {
    const message = error?.error?.message || error?.message || 'An error occurred';
    return throwError(() => ({ message, status: error?.status }));
  }
}
