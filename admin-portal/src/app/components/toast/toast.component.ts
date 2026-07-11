import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../services/toast.service';

/**
 * Fixed bottom-right toast overlay. Reads the live queue from
 * {@link ToastService} and renders each entry with a branded colored border,
 * type icon, message, and an auto-dismiss progress bar. Slides in from the
 * right; stacks up to 3.
 *
 * Classes are `ec-toast-*` prefixed to avoid colliding with the legacy global
 * `.toast` styles in global.scss (which set opacity:0 on the base class).
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="ec-toast-stack" aria-live="polite" aria-atomic="true">
      @for (t of toast.toasts(); track t.id) {
        <div class="ec-toast" [class]="'ec-toast--' + t.type" role="status">
          <span class="ec-toast-icon">{{ icon(t.type) }}</span>
          <span class="ec-toast-msg">{{ t.message }}</span>
          <button class="ec-toast-close" type="button" (click)="toast.dismiss(t.id)" aria-label="Dismiss">✕</button>
          @if (t.duration > 0) {
            <span class="ec-toast-progress" [style.animation-duration.ms]="t.duration"></span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ec-toast-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 3000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .ec-toast {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 260px;
      max-width: 360px;
      padding: 13px 14px 13px 15px;
      border-radius: 10px;
      border-left: 3px solid var(--ec-toast-accent);
      background: var(--admin-surface, #191c2e);
      color: var(--admin-text, #e8eaf4);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28);
      overflow: hidden;
      opacity: 1;
      pointer-events: auto;
      animation: ec-toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .ec-toast--success { --ec-toast-accent: #14B8A6; }
    .ec-toast--warning { --ec-toast-accent: #F59E0B; }
    .ec-toast--error   { --ec-toast-accent: #EF4444; }
    .ec-toast--info    { --ec-toast-accent: #6366F1; }

    .ec-toast-icon {
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
      background: var(--ec-toast-accent);
    }

    .ec-toast-msg {
      flex: 1 1 auto;
      font-size: 13.5px;
      font-weight: 500;
      line-height: 1.35;
    }

    .ec-toast-close {
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
    .ec-toast-close:hover { color: var(--admin-text, #e8eaf4); }

    .ec-toast-progress {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
      width: 100%;
      background: var(--ec-toast-accent);
      opacity: 0.55;
      transform-origin: left center;
      animation-name: ec-toast-progress;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }

    @keyframes ec-toast-in {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }

    @keyframes ec-toast-progress {
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
