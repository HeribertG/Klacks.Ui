// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TooltipService, TooltipConfig } from './tooltip.service';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.scss'],
  standalone: true,
  imports: [NgStyle],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent implements OnInit, OnDestroy {
  private tooltipService = inject(TooltipService);
  private destroy$ = new Subject<void>();

  visible = signal(false);
  text = signal('');
  style = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.tooltipService.tooltip$
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        if (config) {
          this.showTooltip(config);
        } else {
          this.hideTooltip();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private showTooltip(config: TooltipConfig): void {
    if (!config.text || config.text.trim() === '') {
      this.hideTooltip();
      return;
    }

    this.text.set(config.text);

    const offset = 10;
    let x = config.x + offset;
    let y = config.y + offset;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const lines = config.text.split('\n');
    const maxLineLength = Math.max(...lines.map(l => l.length));
    const estimatedWidth = Math.min(maxLineLength * 7 + 20, 400);
    const estimatedHeight = lines.length * 18 + 12;

    if (x + estimatedWidth > viewportWidth) {
      x = config.x - estimatedWidth - offset;
    }

    if (y + estimatedHeight > viewportHeight) {
      y = config.y - estimatedHeight - offset;
    }

    this.style.set({
      left: `${x}px`,
      top: `${y}px`,
      opacity: '1',
      visibility: 'visible',
      display: 'block',
    });

    this.visible.set(true);
  }

  private hideTooltip(): void {
    this.style.set({
      opacity: '0',
      visibility: 'hidden',
      display: 'none',
    });
    this.visible.set(false);
    this.text.set('');
  }
}
