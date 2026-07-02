// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Directive that automatically closes an NgbTooltip after a configurable delay once shown.
 * @param appTooltipAutoClose - Milliseconds before the tooltip auto-closes after being shown (default: 2500); bare attribute uses default
 */
import { DestroyRef, Directive, OnDestroy, OnInit, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

const DEFAULT_DELAY = 2500;

function coerceDelay(v: string | number | ''): number {
  if (v === '' || v === null || v === undefined) return DEFAULT_DELAY;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DELAY;
}

@Directive({
  selector: '[ngbTooltip][appTooltipAutoClose]',
  standalone: true,
})
export class TooltipAutoCloseDirective implements OnInit, OnDestroy {
  readonly appTooltipAutoClose = input<number, string | number | ''>(DEFAULT_DELAY, { transform: coerceDelay });

  private readonly tooltip = inject(NgbTooltip);
  private readonly destroyRef = inject(DestroyRef);
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.tooltip.shown.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearTimer();
      this.timer = setTimeout(() => this.tooltip.close(), this.appTooltipAutoClose());
    });
    this.tooltip.hidden.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearTimer();
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
