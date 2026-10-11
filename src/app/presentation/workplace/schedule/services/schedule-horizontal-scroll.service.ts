// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * @copyright 2025 Heribert Gasparoli
 *
 * @description
 * Service synchronizing horizontal scroll position between ScheduleSection
 * and ShiftSection. Single source of truth for the shared position: every scroll
 * source (thumb, wheel, keyboard, touch) goes through requestPosition, which clamps to
 * the range the scrollbar thumb can reach. Provides locking mechanism to prevent scroll
 * updates during certain operations. Uses signals for reactive state management.
 *
 * @relations
 * - Used by: ScheduleSectionComponent, ShiftSectionComponent
 * - Provided in: ScheduleHomeComponent
 */
import { Injectable, signal } from '@angular/core';
import { maxScrollValue } from 'src/app/presentation/shared/scrollbar/scroll-range.helper';

@Injectable()
export class ScheduleHorizontalScrollService {
  public horizontalPosition = signal<number>(0);
  public maxValue = signal<number>(0);
  public visibleValue = signal<number>(0);

  private locked = false;

  public lock(): void {
    this.locked = true;
  }

  public unlock(): void {
    this.locked = false;
  }

  public isLocked(): boolean {
    return this.locked;
  }

  public setPosition(value: number): void {
    if (this.locked) {
      return;
    }
    if (this.horizontalPosition() !== value) {
      this.horizontalPosition.set(value);
    }
  }

  public requestPosition(value: number): number {
    const clamped = this.clamp(value);
    this.setPosition(clamped);
    return clamped;
  }

  public clamp(value: number): number {
    const max = this.maxValue();
    const upper = max > 0 ? Math.max(0, maxScrollValue(max, this.visibleValue())) : Number.POSITIVE_INFINITY;
    return Math.max(0, Math.min(value, upper));
  }

  public forceSetPosition(value: number): void {
    this.horizontalPosition.set(value);
  }

  public setMaxValue(value: number): void {
    if (this.maxValue() !== value) {
      this.maxValue.set(value);
    }
  }

  public setVisibleValue(value: number): void {
    if (this.visibleValue() !== value) {
      this.visibleValue.set(value);
    }
  }

  public reset(): void {
    this.horizontalPosition.set(0);
  }
}
