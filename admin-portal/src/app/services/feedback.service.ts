import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface FeedbackSubmission {
  category: 'Bug' | 'UI Issue' | 'Feature Request' | 'Question' | 'General';
  message: string;
  pageUrl: string;
  screenshot?: string;
}

const feedbackBase = environment.apiUrl.replace(/\/company\/?$/, '');

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);

  async submit(payload: FeedbackSubmission): Promise<void> {
    await firstValueFrom(
      this.http.post<{ ok: boolean }>(`${feedbackBase}/feedback/submit`, {
        data: payload,
      }),
    );
  }
}
