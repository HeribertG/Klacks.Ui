// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Component-scoped canvas side of the scrollbar: owns the 2D context, the thumb metrics and the pre-rendered
 * thumb images, measures them from the canvas size and draws the thumb at the current value.
 * @param viewport - The scrollbar component's canvas, axis and scroll range, read lazily on every call
 * @param highlighted - Draws the hover image of the thumb instead of the normal one
 */
import { Injectable, inject } from '@angular/core';
import { ScrollbarService } from './scrollbar.service';
import { IMetrics } from './metrics.interface';
import { Metrics } from './metrics.model';
import { IImagesThumps } from './images-thumps.interface';
import { ImagesThumps } from './images-thumps.model';
import { ScrollbarViewport } from './scrollbar-viewport.interface';
import { thumbCrossAxisPosition, thumbMainAxisPosition } from './scrollbar-geometry.helper';

@Injectable()
export class ScrollbarCanvasRendererService {
  private scrollbarService = inject(ScrollbarService);

  metrics: IMetrics = new Metrics();
  imagesThumps: IImagesThumps = new ImagesThumps();

  private viewport!: ScrollbarViewport;
  private ctx: CanvasRenderingContext2D | null = null;

  bind(viewport: ScrollbarViewport): void {
    this.viewport = viewport;
  }

  hasContext(): boolean {
    return !!this.ctx;
  }

  attach(canvas: HTMLCanvasElement): boolean {
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      console.error('Canvas context could not be initialized');
      return false;
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return true;
  }

  release(): void {
    this.ctx = null;
  }

  measure(): void {
    const axis = this.viewport.axis();
    const size = axis.metricsSize(this.viewport.canvas());

    this.metrics = this.scrollbarService.calcMetrics(
      size,
      this.viewport.visibleValue(),
      this.viewport.maxValue()
    );
    axis.createThumbFn(this.scrollbarService, this.metrics, this.imagesThumps);
  }

  draw(highlighted: boolean): void {
    if (!this.isDrawingPossible()) {
      return;
    }

    if (!this.ctx) {
      return;
    }

    const canvas = this.viewport.canvas();
    this.ctx.save();
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawThumb(this.ctx, canvas, highlighted);
    this.ctx.restore();
  }

  private isDrawingPossible(): boolean {
    return (
      (!!this.imagesThumps.imgThumb || !!this.imagesThumps.imgSelectedThumb) &&
      this.metrics.thumbLength !== Infinity &&
      this.metrics.tickSize !== Infinity
    );
  }

  private drawThumb(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, highlighted: boolean): void {
    const thumbImage = highlighted ? this.imagesThumps.imgSelectedThumb : this.imagesThumps.imgThumb;
    if (!thumbImage) {
      return;
    }

    const axis = this.viewport.axis();
    const isHorizontal = this.viewport.isHorizontal();
    const mainAxisPos = thumbMainAxisPosition(
      {
        canvasMainSize: canvas[axis.canvasSizeProp] ?? 0,
        thumbSize: thumbImage[axis.thumbSizeProp],
        maxValue: this.viewport.maxValue(),
        visibleValue: this.viewport.visibleValue(),
      },
      this.viewport.value(),
      this.viewport.isHorizontalRtl()
    );
    const crossAxisPos = thumbCrossAxisPosition(
      canvas[axis.canvasCrossSizeProp] ?? 0,
      isHorizontal ? thumbImage.height : thumbImage.width
    );

    const xPosition = isHorizontal ? mainAxisPos : crossAxisPos;
    const yPosition = isHorizontal ? crossAxisPos : mainAxisPos;

    ctx.putImageData(thumbImage, xPosition, yPosition);
  }
}
