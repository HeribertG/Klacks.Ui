// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service synchronizing horizontal scroll position between ScheduleSection
 * and ShiftSection. Provides locking mechanism to prevent scroll updates
 * during certain operations. Uses signals for reactive state management.
 *
 * @relations
 * - Used by: ScheduleSectionComponent, ShiftSectionComponent
 * - Provided in: ScheduleHomeComponent
 */
import { Injectable, signal } from '@angular/core';

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
