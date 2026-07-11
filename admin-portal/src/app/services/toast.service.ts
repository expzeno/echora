import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

/**
 * Branded, signal-based toast system for the Echora admin portal.
 * Renders through {@link ToastComponent} — an in-app overlay independent of
 * Ionic's ToastController so we control the visual language (colored border,
 * Slate surface, progress bar) end-to-end.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** Live queue — the overlay renders at most the latest 3. */
  readonly toasts = signal<Toast[]>([]);

  private seq = 0;

  /**
   * Push a toast onto the stack. Auto-removes after `duration` ms
   * (pass 0 to make it sticky). The stack is capped at the 3 most recent.
   */
  show(message: string, type: ToastType = 'success', duration = 3000): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, message, type, duration }].slice(-3));

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
