import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { TokensService } from '../../services/tokens.service';
import { NotificationService } from '../../services/notification.service';
import { TokenPayload, TokenColors, TokenSpacing, TokenFonts } from '../../models/tokens.model';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const SYSTEM_FONTS = [
  'system-ui', 'Arial', 'Helvetica', 'Verdana', 'Georgia', 'Times New Roman',
  'Courier New', 'Trebuchet MS', 'Palatino', 'Garamond', 'Bookman',
  'Comic Sans MS', 'Impact', 'Lucida Console', 'Tahoma', 'Geneva',
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Nunito', 'Raleway', 'Source Sans Pro', 'PT Sans', 'Noto Sans',
];

function hexColorValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return HEX_PATTERN.test(control.value) ? null : { hexColor: true };
}

function minSpacingValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (val === null || val === undefined || val === '') return null;
  if (!Number.isInteger(Number(val))) return { integer: true };
  if (Number(val) < 4) return { minSpacing: true };
  return null;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

@Component({
  selector: 'app-tokens-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './tokens-form.html',
  styleUrl: './tokens-form.scss',
})
export class TokensFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tokensService = inject(TokensService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly merchantId = input.required<string>();
  readonly submitting = signal(false);
  readonly contrastWarning = signal<string | null>(null);

  readonly form = this.fb.group({
    colors: this.fb.group({
      primary: ['#635bff', [Validators.required, hexColorValidator]],
      secondary: ['#64748b', [Validators.required, hexColorValidator]],
      accent: ['#818cf8', [Validators.required, hexColorValidator]],
      success: ['#22c55e', [Validators.required, hexColorValidator]],
      warning: ['#f59e0b', [Validators.required, hexColorValidator]],
      danger: ['#ef4444', [Validators.required, hexColorValidator]],
      text: ['#0f172a', [Validators.required, hexColorValidator]],
      textMuted: ['#94a3b8', [Validators.required, hexColorValidator]],
      bg: ['#f8fafc', [Validators.required, hexColorValidator]],
      bgAlt: ['#ffffff', [Validators.required, hexColorValidator]],
    }),
    spacing: this.fb.group({
      base: [8, [Validators.required, minSpacingValidator]],
      button: [12, [Validators.required, minSpacingValidator]],
      section: [24, [Validators.required, minSpacingValidator]],
      card: [16, [Validators.required, minSpacingValidator]],
      input: [12, [Validators.required, minSpacingValidator]],
    }),
    fonts: this.fb.group({
      primary: ['Inter', Validators.required],
      secondary: ['Georgia', Validators.required],
      sizes: this.fb.group({
        body: [16, [Validators.required, Validators.min(10), Validators.max(24)]],
        heading: [24, [Validators.required, Validators.min(16), Validators.max(48)]],
        small: [12, [Validators.required, Validators.min(10), Validators.max(16)]],
      }),
    }),
    mode: ['light' as 'light' | 'dark', Validators.required],
  });

  readonly fontWeights = signal<number[]>([400, 500, 600, 700]);
  readonly systemFonts = SYSTEM_FONTS;

  readonly demoStyles = computed(() => {
    const colors = this.form.get('colors')!.value as Record<string, string>;
    const spacing = this.form.get('spacing')!.value as Record<string, number>;
    const fonts = this.form.get('fonts')!.value as any;
    return {
      '--zeno-color-primary': colors['primary'] || '#635bff',
      '--zeno-color-secondary': colors['secondary'] || '#64748b',
      '--zeno-color-text': colors['text'] || '#0f172a',
      '--zeno-color-text-muted': colors['textMuted'] || '#94a3b8',
      '--zeno-color-bg': colors['bg'] || '#f8fafc',
      '--zeno-color-bg-alt': colors['bgAlt'] || '#ffffff',
      '--zeno-color-success': colors['success'] || '#22c55e',
      '--zeno-color-danger': colors['danger'] || '#ef4444',
      '--zeno-spacing-base': `${spacing['base'] || 8}px`,
      '--zeno-spacing-button': `${spacing['button'] || 12}px`,
      '--zeno-spacing-card': `${spacing['card'] || 16}px`,
      '--zeno-spacing-section': `${spacing['section'] || 24}px`,
      '--zeno-font-primary': fonts?.primary || 'Inter',
      '--zeno-font-secondary': fonts?.secondary || 'Georgia',
      '--zeno-font-size-body': `${fonts?.sizes?.body || 16}px`,
      '--zeno-font-size-heading': `${fonts?.sizes?.heading || 24}px`,
      '--zeno-font-size-small': `${fonts?.sizes?.small || 12}px`,
    };
  });

  constructor() {
    effect(() => {
      // trigger recompute on form changes
      this.demoStyles();
    });

    this.form.get('colors')!.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.checkContrast();
      this.updateDemoSignal();
    });

    this.form.get('spacing')!.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.updateDemoSignal());

    this.form.get('fonts')!.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.updateDemoSignal());
  }

  private updateDemoSignal(): void {
    // Force computed to recalculate by reading form values
    // The computed reads form.value which is not signal-tracked,
    // so we use a trigger signal
    this._demoTrigger.update(v => v + 1);
  }

  private readonly _demoTrigger = signal(0);

  readonly demoStylesLive = computed(() => {
    this._demoTrigger();
    const colors = this.form.get('colors')!.value as Record<string, string>;
    const spacing = this.form.get('spacing')!.value as Record<string, number>;
    const fonts = this.form.get('fonts')!.value as any;
    return {
      '--zeno-color-primary': colors['primary'] || '#635bff',
      '--zeno-color-secondary': colors['secondary'] || '#64748b',
      '--zeno-color-text': colors['text'] || '#0f172a',
      '--zeno-color-text-muted': colors['textMuted'] || '#94a3b8',
      '--zeno-color-bg': colors['bg'] || '#f8fafc',
      '--zeno-color-bg-alt': colors['bgAlt'] || '#ffffff',
      '--zeno-color-success': colors['success'] || '#22c55e',
      '--zeno-color-danger': colors['danger'] || '#ef4444',
      '--zeno-spacing-base': `${spacing['base'] || 8}px`,
      '--zeno-spacing-button': `${spacing['button'] || 12}px`,
      '--zeno-spacing-card': `${spacing['card'] || 16}px`,
      '--zeno-spacing-section': `${spacing['section'] || 24}px`,
      '--zeno-font-primary': fonts?.primary || 'Inter',
      '--zeno-font-secondary': fonts?.secondary || 'Georgia',
      '--zeno-font-size-body': `${fonts?.sizes?.body || 16}px`,
      '--zeno-font-size-heading': `${fonts?.sizes?.heading || 24}px`,
      '--zeno-font-size-small': `${fonts?.sizes?.small || 12}px`,
    };
  });

  private checkContrast(): void {
    const colors = this.form.get('colors')!.value as Record<string, string>;
    const text = colors['text'];
    const bg = colors['bg'];
    if (!text || !bg || !HEX_PATTERN.test(text) || !HEX_PATTERN.test(bg)) {
      this.contrastWarning.set(null);
      return;
    }
    const ratio = contrastRatio(text, bg);
    if (ratio < 4.5) {
      this.contrastWarning.set(`Text/background contrast ratio is ${ratio.toFixed(2)}:1 — WCAG AA requires 4.5:1`);
    } else {
      this.contrastWarning.set(null);
    }
  }

  hasError(path: string, error: string): boolean {
    const control = this.form.get(path);
    return !!control && control.hasError(error) && (control.dirty || control.touched);
  }

  setColor(path: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.get(path)?.setValue(value);
  }

  toggleWeight(weight: number): void {
    const current = this.fontWeights();
    if (current.includes(weight)) {
      if (current.length > 1) {
        this.fontWeights.set(current.filter(w => w !== weight));
      }
    } else {
      this.fontWeights.set([...current, weight].sort());
    }
  }

  isWeightSelected(weight: number): boolean {
    return this.fontWeights().includes(weight);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const payload: TokenPayload = {
      merchantId: this.merchantId(),
      colors: raw.colors as TokenColors,
      spacing: raw.spacing as TokenSpacing,
      fonts: {
        ...raw.fonts,
        weights: this.fontWeights(),
      } as TokenFonts,
      mode: raw.mode as 'light' | 'dark',
    };

    this.tokensService.saveTokens(this.merchantId(), payload).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: () => {
        this.notify.success('Design tokens saved successfully');
      },
      error: (err: { status?: number; message?: string }) => {
        if (err.status === 409) {
          this.notify.error('Conflict — tokens were modified by another user. Please refresh.');
        } else if (err.status === 400) {
          this.notify.error(err.message || 'Validation error — check your inputs');
        } else {
          this.notify.error(err.message || 'Failed to save tokens');
        }
      },
    });
  }
}
