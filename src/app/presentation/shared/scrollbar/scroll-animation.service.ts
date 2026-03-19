// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service zur Verwaltung der Scroll-Animation (requestAnimationFrame-Loop, Frame-Modulo, Beschleunigung).
 * @param moveAnimationValue - Richtung der Animation (-1 = rückwärts, 0 = keine, 1 = vorwärts)
 * @param moveAnimationFrameModulo - Frame-Modulo zur Steuerung der Animationsgeschwindigkeit
 * @param shouldStopAnimation - Flag zum Stoppen der laufenden Animation
 */
import { Injectable, NgZone, inject } from '@angular/core';
import { SCROLLBAR_CONSTANTS } from './constants';

enum ArrowDirection {
  NONE = 0,
  BACKWARD = -1,
  FORWARD = 1,
}

export interface ScrollAnimationContext {
  getValue: () => number;
  getMaxValue: () => number;
  getVisibleValue: () => number;
  getTickSize: () => number;
  getThumbSize: () => number;
  getCanvasOffset: () => number;
  getMousePosition: () => number | null;
  isScrollbarClick: () => boolean;
  updateValue: (newValue: number) => void;
  emitValueChange: () => void;
  onStopAnimation: () => void;
}

@Injectable()
export class ScrollAnimationService {
  private zone = inject(NgZone);

  private moveAnimationValue = ArrowDirection.NONE;
  private moveAnimationFrameCount = 0;
  private moveAnimationFrameModulo = 10;
  private frameRequests: number[] = [];
  private shouldStopAnimation = false;
  private arrowHoldTimeout: ReturnType<typeof setTimeout> | undefined;
  private context: ScrollAnimationContext | null = null;

  private readonly INITIAL_ANIMATION_FRAME_MODULO = 10;

  setContext(context: ScrollAnimationContext): void {
    this.context = context;
  }

  startBarAnimation(direction: number): void {
    this.moveAnimationValue = direction as ArrowDirection;
    this.moveAnimationFrameModulo = SCROLLBAR_CONSTANTS.MAX_FRAME_MODULO;
    this.shouldStopAnimation = false;
    this.runAnimation(SCROLLBAR_CONSTANTS.FIRST_STEP_BAR);
  }

  startArrowHoldAnimation(direction: number, initialValue: number): void {
    this.context?.updateValue(initialValue);
    this.moveAnimationValue = direction as ArrowDirection;

    this.arrowHoldTimeout = setTimeout(() => {
      this.moveAnimationFrameModulo = SCROLLBAR_CONSTANTS.MAX_FRAME_MODULO;
      this.shouldStopAnimation = false;
      this.runAnimation(SCROLLBAR_CONSTANTS.FIRST_STEP_BUTTON);
    }, 300);
  }

  stopArrowHold(): void {
    if (this.arrowHoldTimeout != null) {
      clearTimeout(this.arrowHoldTimeout);
      this.arrowHoldTimeout = undefined;
    }
    this.stopAnimation();
  }

  stopAnimation(): void {
    this.shouldStopAnimation = true;
    this.resetAnimationState();
    this.cancelAnimationFrames();
    this.context?.onStopAnimation();
  }

  cancelAnimationFrames(): void {
    this.frameRequests.forEach((requestId) =>
      window.cancelAnimationFrame(requestId)
    );
    this.frameRequests = [];
  }

  destroy(): void {
    this.stopAnimation();
    this.cancelAnimationFrames();
    this.context = null;
  }

  private runAnimation(steps: number): void {
    this.zone.runOutsideAngular(() => {
      this.processAnimationFrame(steps);
    });
  }

  private processAnimationFrame(steps: number): void {
    this.moveAnimationFrameCount++;

    if (this.shouldStopAnimation) {
      return;
    }

    if (this.shouldUpdateValue()) {
      if (!this.checkScrollbarClickBounds()) {
        return;
      }
      this.updateAnimationState(steps);
      this.context?.emitValueChange();
    }

    this.scheduleNextFrame(steps);
  }

  private checkScrollbarClickBounds(): boolean {
    if (!this.context) return true;

    if (this.context.isScrollbarClick()) {
      const mousePosition = this.context.getMousePosition();
      if (mousePosition === null) return true;

      const trackerSize = this.context.getThumbSize();
      const trackerPosition = this.context.getValue() * this.context.getTickSize();
      const trackerEnd = trackerPosition + trackerSize;

      if (
        (this.moveAnimationValue < 0 && trackerPosition <= mousePosition) ||
        (this.moveAnimationValue > 0 && trackerEnd >= mousePosition)
      ) {
        this.stopAnimation();
        return false;
      }
    }

    return true;
  }

  private shouldUpdateValue(): boolean {
    return (
      this.moveAnimationFrameModulo <= 1 ||
      this.moveAnimationFrameCount % this.moveAnimationFrameModulo === 0
    );
  }

  private updateAnimationState(steps: number): void {
    this.decreaseFrameModulo();
    this.updateScrollValue(steps);
  }

  private decreaseFrameModulo(): void {
    if (this.moveAnimationFrameModulo > 1) {
      this.moveAnimationFrameModulo -= 2;
    }
  }

  private updateScrollValue(steps: number): void {
    if (!this.context) return;

    const IS_BACKWARD_LIMIT = -1;
    const currentValue = this.context.getValue();
    const newValue = currentValue + steps * this.moveAnimationValue;

    const realMax =
      this.context.getMaxValue() -
      this.context.getVisibleValue() +
      SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;

    if (
      (this.moveAnimationValue > 0 && newValue >= realMax) ||
      (this.moveAnimationValue < 0 && newValue <= IS_BACKWARD_LIMIT)
    ) {
      this.stopAnimation();
      return;
    }

    this.context.updateValue(newValue);
  }

  private scheduleNextFrame(steps: number): void {
    const requestId = window.requestAnimationFrame(() => {
      this.frameRequests.push(requestId);
      this.runAnimation(steps);
    });
  }

  private resetAnimationState(): void {
    this.moveAnimationFrameCount = 0;
    this.moveAnimationValue = ArrowDirection.NONE;
    this.moveAnimationFrameModulo = this.INITIAL_ANIMATION_FRAME_MODULO;
  }
}
