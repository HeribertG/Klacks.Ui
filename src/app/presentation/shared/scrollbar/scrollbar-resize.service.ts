// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Component-scoped canvas resizing of the scrollbar: applies ResizeObserver entries of the scrollbar container
 * (minus the arrow padding) and debounced window resizes to the canvas, then lets the host refresh.
 * @param host - The scrollbar component's canvas, axis and refresh command
 * @param event - ResizeObserver entries emitted by the appResize directive (anything else is ignored)
 */
import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, debounceTime, fromEvent, takeUntil } from 'rxjs';
import { ScrollbarHost } from './scrollbar-host.interface';

@Injectable()
export class ScrollbarResizeService {
  private zone = inject(NgZone);

  private readonly CANVAS_PADDING = 50;
  private readonly WINDOW_RESIZE_DEBOUNCE_MS = 150;

  private host!: ScrollbarHost;

  bind(host: ScrollbarHost): void {
    this.host = host;
  }

  listenToWindow(destroy$: Observable<void>): void {
    fromEvent(window, 'resize')
      .pipe(debounceTime(this.WINDOW_RESIZE_DEBOUNCE_MS), takeUntil(destroy$))
      .subscribe(() => this.handleWindowResize());
  }

  applyResizeEntries(event: unknown): void {
    const entries = Array.isArray(event)
      ? (event as ResizeObserverEntry[])
      : [];
    if (entries?.[0]) {
      const extracted = this.host.axis().resizeExtract(entries[0], this.CANVAS_PADDING);
      this.updateCanvasSize(extracted.width, extracted.height);
    }
  }

  private updateCanvasSize(width: number, height?: number): void {
    const canvas = this.host.canvas();
    if (!canvas) return;

    this.zone.run(() => {
      canvas.width = width;
      canvas.height = height ?? canvas.offsetHeight;
      this.host.refresh();
    });
  }

  private handleWindowResize(): void {
    const canvas = this.host.canvas();
    if (!canvas) return;
    this.updateCanvasSize(canvas.offsetWidth);
  }
}
