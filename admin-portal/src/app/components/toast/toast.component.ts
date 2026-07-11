import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../services/toast.service';

/**
 * Fixed bottom-right toast overlay. Reads the live queue from
 * {@link ToastService} and renders each entry with a branded colored border,
 * type icon, message, and an auto-dismiss progress bar. Slides in from the
 * right; stacks up to 3.
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast--' + t.type" role="status">
          <span class="toast-icon">{{ icon(t.type) }}</span>
          <span class="toast-msg">{{ t.message }}</span>
          <button class="toast-close" type="button" (click)="toast.dismiss(t.id)" aria-label="Dismiss">✕</button>
          @if (t.duration > 0) {
            <span class="toast-progress" [style.animation-duration.ms]="t.duration"></span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 3000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .toast {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 260px;
      max-width: 360px;
      padding: 13px 14px 13px 15px;
      border-radius: 10px;
      border-left: 3px solid var(--toast-accent);
      background: var(--admin-surface, #191c2e);
      color: var(--admin-text, #e8eaf4);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28);
      overflow: hidden;
      pointer-events: auto;
      animation: toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toast--success { --toast-accent: #14B8A6; }
    .toast--warning { --toast-accent: #F59E0B; }
    .toast--error   { --toast-accent: #EF4444; }
    .toast--info    { --toast-accent: #6366F1; }

    .toast-icon {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      color: #fff;
      background: var(--toast-accent);
    }

    .toast-msg {
      flex: 1 1 auto;
      font-size: 13.5px;
      font-weight: 500;
      line-height: 1.35;
    }

    .toast-close {
      flex: 0 0 auto;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      color: var(--admin-text-muted, #6b708e);
      transition: color 0.15s ease;
    }
    .toast-close:hover { color: var(--admin-text, #e8eaf4); }

    .toast-progress {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
      width: 100%;
      background: var(--toast-accent);
      opacity: 0.55;
      transform-origin: left center;
      animation-name: toast-progress;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }

    @keyframes toast-in {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }

    @keyframes toast-progress {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }
  `],
})
export class ToastComponent {
  readonly toast = inject(ToastService);

  icon(type: ToastType): string {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error':   return '✕';
      case 'info':    return 'ℹ';
    }
  }
}
