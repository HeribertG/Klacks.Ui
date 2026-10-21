// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Component-scoped mouse and pointer handling of the scrollbar canvas: hover state, thumb hit test, thumb drag
 * (with pointer capture, LTR and mirrored RTL mapping) and track clicks that drive the ScrollAnimationService.
 * @param host - The scrollbar component's canvas, axis, scroll range and value/redraw commands
 * @param canvas - The scrollbar canvas whose events are observed until destroy$ emits
 */
import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, fromEvent, takeUntil, throttleTime } from 'rxjs';
import { isMacContextClick } from 'src/app/shared/helpers/context-click.helper';
import { ScrollAnimationService } from './scroll-animation.service';
import { ScrollbarCanvasRendererService } from './scrollbar-canvas-renderer.service';
import { ScrollbarHost } from './scrollbar-host.interface';
import { ThumbTrack } from './thumb-track.interface';
import {
  isPositionOnThumb,
  mirroredThumbStart,
  mirroredValueForThumbStart,
} from './scrollbar-geometry.helper';

@Injectable()
export class ScrollbarPointerService {
  private zone = inject(NgZone);
  private animationService = inject(ScrollAnimationService);
  private renderer = inject(ScrollbarCanvasRendererService);

  private readonly FPS_THROTTLE = 16;
  private readonly MOUSE_PRIMARY_BUTTON = 1;
  private readonly PRIMARY_BUTTON_INDEX = 0;

  private host!: ScrollbarHost;
  private mouseEnterThumb = false;
  private mousePointThumb = false;
  private mousePosToThumbPos = 0;
  private mouseOverThumb = false;
  private lastMouseEvent: MouseEvent | null = null;
  private isScrollbarClick = false;

  bind(host: ScrollbarHost): void {
    this.host = host;
  }

  connectAnimation(): void {
    this.animationService.setContext({
      getValue: () => this.host.value(),
      getMaxValue: () => this.host.maxValue(),
      getVisibleValue: () => this.host.visibleValue(),
      getTickSize: () => this.renderer.metrics.tickSize,
      getThumbSize: () => this.renderer.imagesThumps.imgThumb?.[this.host.axis().thumbSizeProp] || 0,
      getCanvasOffset: () => this.host.canvas()[this.host.axis().canvasOffset],
      getMousePosition: () => (this.lastMouseEvent ? this.canvasPosition(this.lastMouseEvent) : null),
      isScrollbarClick: () => this.isScrollbarClick,
      updateValue: (newValue: number) => this.host.updateValue(newValue),
      emitValueChange: () => this.host.emitValueChange(),
      onStopAnimation: () => {
        this.lastMouseEvent = null;
        this.isScrollbarClick = false;
      },
    });
  }

  listen(canvas: HTMLCanvasElement, destroy$: Observable<void>): void {
    fromEvent<MouseEvent>(canvas, 'mousedown')
      .pipe(takeUntil(destroy$))
      .subscribe((event) => this.onMouseDown(event));

    fromEvent<MouseEvent>(canvas, 'mouseup')
      .pipe(takeUntil(destroy$))
      .subscribe(() => this.onMouseUp());

    fromEvent<MouseEvent>(canvas, 'mousemove')
      .pipe(throttleTime(this.FPS_THROTTLE), takeUntil(destroy$))
      .subscribe((event) => this.onMouseMove(event));

    fromEvent<MouseEvent>(canvas, 'mouseleave')
      .pipe(takeUntil(destroy$))
      .subscribe(() => this.onMouseLeave());

    fromEvent<MouseEvent>(canvas, 'mouseenter')
      .pipe(takeUntil(destroy$))
      .subscribe((event) => this.onMouseEnter(event));

    fromEvent<PointerEvent>(canvas, 'pointerdown')
      .pipe(takeUntil(destroy$))
      .subscribe((event) => this.onPointerDown(event));

    fromEvent<PointerEvent>(canvas, 'pointerup')
      .pipe(takeUntil(destroy$))
      .subscribe((event) => this.onPointerUp(event));

    fromEvent<PointerEvent>(canvas, 'pointermove')
      .pipe(takeUntil(destroy$))
      .subscribe((event) => this.onPointerMove(event));
  }

  isOverThumb(): boolean {
    return this.mouseOverThumb;
  }

  release(): void {
    this.lastMouseEvent = null;
  }

  isPrimaryClick(event: MouseEvent): boolean {
    return event.button === this.PRIMARY_BUTTON_INDEX && !isMacContextClick(event);
  }

  isMouseOverThumb(event: MouseEvent): boolean {
    const canvas = this.host.canvas();
    if (canvas) {
      const thumb = this.renderer.imagesThumps.imgThumb;
      return isPositionOnThumb(
        this.canvasPosition(event),
        this.renderer.metrics.tickSize,
        this.host.value(),
        thumb ? thumb[this.host.axis().thumbSizeProp] : undefined
      );
    }

    return false;
  }

  private canvasPosition(event: MouseEvent): number {
    const canvas = this.host.canvas();
    const axis = this.host.axis();
    let pos: number = event[axis.clientPos] - canvas[axis.canvasOffset];
    if (this.host.isHorizontalRtl()) {
      pos = canvas[axis.canvasSizeProp] - pos;
    }
    return pos;
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.isPrimaryClick(event)) return;
    this.mouseEnterThumb = this.isMouseOverThumb(event);
    this.mouseOverThumb = this.mouseEnterThumb;
    this.handleNonThumbClick(event);
  }

  private handleNonThumbClick(event: MouseEvent): void {
    const canvas = this.host.canvas();
    if (canvas && !this.mouseEnterThumb) {
      this.lastMouseEvent = event;
      this.isScrollbarClick = true;

      const axis = this.host.axis();
      const mousePos = event[axis.clientPos];
      const canvasOffset = canvas[axis.canvasOffset];
      const thumbPos = this.thumbPositionForValue(this.host.value()) + canvasOffset;
      const clickedBefore = mousePos < thumbPos;
      const direction = (clickedBefore !== this.host.isHorizontalRtl()) ? -1 : 1;
      this.animationService.startBarAnimation(direction);
    }
  }

  private onMouseUp(): void {
    this.mouseEnterThumb = false;
    this.mousePosToThumbPos = 0;
    const canvas = this.host.canvas();
    if (canvas) {
      canvas.onpointermove = null;
    }
    this.animationService.stopAnimation();
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouseOverThumb = this.isMouseOverThumb(event);

    if (this.mouseOverThumb) {
      this.animationService.stopAnimation();
    }

    this.host.reDraw();
    this.host.updateArrowButtonsState();
  }

  private onMouseLeave(): void {
    this.mouseOverThumb = false;
    this.animationService.stopAnimation();
    this.lastMouseEvent = null;
    this.host.refresh();
  }

  private onMouseEnter(event: MouseEvent): void {
    if (this.mousePosToThumbPos > 0) {
      this.mouseOverThumb = this.isMouseOverThumb(event);
      this.host.refresh();
    }
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.isPrimaryClick(event)) return;
    this.mousePointThumb = this.isMouseOverThumb(event);
    if (this.mousePointThumb && event.buttons === this.MOUSE_PRIMARY_BUTTON) {
      const thumbPosition = this.thumbPositionForValue(this.host.value());
      this.mousePosToThumbPos = event[this.host.axis().clientPos] - thumbPosition;

      const canvas = this.host.canvas();
      if (canvas) {
        canvas.setPointerCapture(event.pointerId);
      }
    }
  }

  private onPointerUp(event: PointerEvent): void {
    this.mousePointThumb = false;
    const canvas = this.host.canvas();
    if (canvas?.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.mousePointThumb) {
      this.updateValueFromPointerMove(event);
    }
  }

  private updateValueFromPointerMove(event: PointerEvent): void {
    const pos = event[this.host.axis().clientPos] - this.mousePosToThumbPos;
    this.zone.runOutsideAngular(() => {
      if (this.mousePointThumb) {
        if (this.host.isHorizontalRtl()) {
          const mirroredValue = mirroredValueForThumbStart(this.track(), pos);
          if (mirroredValue !== null) {
            this.host.updateValue(mirroredValue);
          }
        } else {
          const tickSize = this.renderer.metrics.tickSize;
          const correctValue = tickSize > 0 ? Math.round(pos / tickSize) : 0;
          this.host.updateValue(correctValue);
        }
      }
    });
  }

  private thumbPositionForValue(value: number): number {
    if (this.host.isHorizontalRtl()) {
      return mirroredThumbStart(this.track(), value);
    }
    return value * this.renderer.metrics.tickSize;
  }

  private track(): ThumbTrack {
    const axis = this.host.axis();
    return {
      canvasMainSize: this.host.canvas()[axis.canvasSizeProp] ?? 0,
      thumbSize: this.renderer.imagesThumps.imgThumb?.[axis.thumbSizeProp] ?? 0,
      maxValue: this.host.maxValue(),
      visibleValue: this.host.visibleValue(),
    };
  }
}
