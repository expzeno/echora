import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { FeedbackService, FeedbackSubmission } from '../../services/feedback.service';

@Component({
  selector: 'app-feedback-fab',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './feedback-fab.html',
  styleUrl: './feedback-fab.scss',
})
export class FeedbackFabComponent {
  private readonly feedback = inject(FeedbackService);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly open = signal(false);
  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);
  readonly screenshotBase64 = signal<string | null>(null);
  readonly capturingScreenshot = signal(false);
  readonly showTooltip = signal(!localStorage.getItem('fb-tooltip-dismissed'));
  readonly nudgeDismissed = signal(false);
  readonly messageLen = signal(0);

  readonly categoryCtrl = new FormControl<FeedbackSubmission['category']>('Bug', { nonNullable: true });
  readonly messageCtrl = new FormControl('');

  readonly categories: FeedbackSubmission['category'][] = ['Bug', 'UI Issue', 'Feature Request', 'Question', 'General'];

  private static readonly NUDGE_PROMPTS: Record<string, string> = {
    'Bug': 'What were you trying to do, and what happened instead?',
    'UI Issue': 'Which element looks wrong, and what did you expect?',
    'Feature Request': 'How would this help your workflow?',
    'Question': 'Any context that would help us understand your question?',
    'General': 'Can you tell us more about what you experienced?',
  };

  readonly contextNudge = computed(() => {
    if (this.nudgeDismissed()) return null;
    const len = this.messageLen();
    if (len === 0 || len >= 20) return null;
    return FeedbackFabComponent.NUDGE_PROMPTS[this.categoryCtrl.value] ?? null;
  });

  get currentPage(): string {
    return window.location.pathname;
  }

  dismissTooltip(): void {
    this.showTooltip.set(false);
    localStorage.setItem('fb-tooltip-dismissed', '1');
  }

  onMessageInput(): void {
    this.messageLen.set((this.messageCtrl.value ?? '').trim().length);
  }

  dismissNudge(): void {
    this.nudgeDismissed.set(true);
  }

  openModal(): void {
    this.dismissTooltip();
    this.open.set(true);
    this.sent.set(false);
    this.error.set(null);
    this.screenshotBase64.set(null);
    this.messageCtrl.reset();
    this.messageLen.set(0);
    this.nudgeDismissed.set(false);
    this.categoryCtrl.setValue('Bug');
  }

  closeModal(): void {
    this.open.set(false);
  }

  async captureScreen(): Promise<void> {
    this.capturingScreenshot.set(true);
    this.error.set(null);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(document.body, {
        pixelRatio: 0.5,
        filter: (node: Node) => !(node instanceof Element && node.tagName === 'APP-FEEDBACK-FAB'),
      });
      this.screenshotBase64.set(dataUrl);
    } catch {
      this.error.set('Screenshot capture failed — try uploading instead.');
    } finally {
      this.capturingScreenshot.set(false);
    }
  }

  uploadFile(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Only image files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('Image must be under 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = img.width > MAX ? MAX / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.screenshotBase64.set(canvas.toDataURL('image/jpeg', 0.65));
        this.error.set(null);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeScreenshot(): void {
    this.screenshotBase64.set(null);
  }

  async send(): Promise<void> {
    if ((!this.messageCtrl.value?.trim() && !this.screenshotBase64()) || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.feedback.submit({
        category: this.categoryCtrl.value,
        message: this.messageCtrl.value ?? '',
        pageUrl: `[admin] ${window.location.href}`,
        screenshot: this.screenshotBase64() ?? undefined,
      });
      this.sent.set(true);
      setTimeout(() => this.closeModal(), 1200);
    } catch {
      this.error.set('Could not submit — please try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
