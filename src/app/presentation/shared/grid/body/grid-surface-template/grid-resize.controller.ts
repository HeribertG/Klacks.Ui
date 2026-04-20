// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Observes the surface's parent element and drives the canvas resize
 * pipeline: applies the new box dimensions, requests a redraw, detects
 * device-pixel-ratio changes, and updates scrollbars via a callback.
 * Extracted from GridSurfaceTemplateComponent so the surface no longer
 * owns ResizeObserver bookkeeping or pixel-ratio state.
 *
 * @param drawSchedule - Canvas size + lifecycle (createCanvas/rebuild/redraw)
 */
import { inject, Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';

const RESIZE_THRESHOLD_PX = 2;

export interface GridResizeOptions {
  /** Emits after a resize has been applied so scrollbars/viewport can refresh. */
  onResized: () => void;
  /** Diagnostic tag when ResizeObserver is unavailable. */
  nameId: string;
}

@Injectable()
export class GridResizeController {
  private readonly drawSchedule = inject(BaseDrawScheduleService);

  private observer?: ResizeObserver;
  private lastWidth = 0;
  private lastHeight = 0;
  private pendingResize?: { width: number; height: number };
  private pixelRatio = DrawHelper.pixelRatio();
  private options?: GridResizeOptions;

  observeParent(parentElement: HTMLElement | null, options: GridResizeOptions): void {
    this.options = options;
    if (!parentElement || typeof window === 'undefined' || !('ResizeObserver' in window)) {
      console.warn('[TEMPLATE] ResizeObserver not available or no parent element:', options.nameId);
      return;
    }
    this.observer = new ResizeObserver((entries) => this.handleResize(entries));
    this.observer.observe(parentElement);
  }

  /**
   * Consume any resize event captured before the canvas was ready.
   * Call after drawSchedule.createCanvas() in ngAfterViewInit.
   */
  applyPendingResize(): void {
    if (!this.pendingResize || !this.drawSchedule.isCanvasAvailable()) {
      return;
    }
    const { width, height } = this.pendingResize;
    this.pendingResize = undefined;
    this.applyDimensions(width, height);
  }

  refreshPixelRatio(): void {
    this.checkPixelRatio();
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private handleResize(entries: ResizeObserverEntry[]): void {
    if (!entries || entries.length === 0) return;

    const entry = entries[0];
    const newWidth = Math.round(entry.contentRect.width);
    const newHeight = Math.round(entry.contentRect.height);
    if (newWidth <= 0 || newHeight <= 0) return;

    if (!this.drawSchedule.isCanvasAvailable()) {
      this.pendingResize = { width: newWidth, height: newHeight };
      return;
    }

    this.applyDimensions(newWidth, newHeight);
  }

  private applyDimensions(width: number, height: number): void {
    if (
      Math.abs(width - this.lastWidth) < RESIZE_THRESHOLD_PX &&
      Math.abs(height - this.lastHeight) < RESIZE_THRESHOLD_PX
    ) {
      return;
    }
    this.lastWidth = width;
    this.lastHeight = height;
    this.drawSchedule.width = width;
    this.drawSchedule.height = height;
    this.drawSchedule.refresh();
    this.checkPixelRatio();
    this.options?.onResized();
  }

  private checkPixelRatio(): void {
    const current = DrawHelper.pixelRatio();
    if (this.pixelRatio === current) return;
    this.pixelRatio = current;
    this.drawSchedule.createCanvas();
    this.drawSchedule.rebuild();
    this.drawSchedule.redraw();
  }
}
