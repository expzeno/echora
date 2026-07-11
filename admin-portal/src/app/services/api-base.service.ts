import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiBaseService {
  private readonly http = inject(HttpClient);

  get<T = any>(path: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http
      .get<T>(`${environment.apiUrl}${path}`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  post<T = any>(path: string, data?: any): Observable<T> {
    return this.http
      .post<T>(`${environment.apiUrl}${path}`, { data: data || {} })
      .pipe(catchError(this.handleError));
  }

  postFormData<T = any>(path: string, formData: FormData): Observable<T> {
    return this.http
      .post<T>(`${environment.apiUrl}${path}`, formData)
      .pipe(catchError(this.handleError));
  }

  delete<T = any>(path: string): Observable<T> {
    return this.http
      .delete<T>(`${environment.apiUrl}${path}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    const message = error?.error?.message || error?.message || 'An error occurred';
    return throwError(() => ({ message, status: error?.status }));
  }
}
