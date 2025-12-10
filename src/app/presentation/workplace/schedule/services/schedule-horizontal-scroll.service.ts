import { Injectable, signal } from '@angular/core';

@Injectable()
export class ScheduleHorizontalScrollService {
  public horizontalPosition = signal<number>(0);
  public maxValue = signal<number>(0);
  public visibleValue = signal<number>(0);

  private locked = false;

  public lock(): void {
    console.log('[HScrollService] LOCK');
    this.locked = true;
  }

  public unlock(): void {
    console.log('[HScrollService] UNLOCK');
    this.locked = false;
  }

  public isLocked(): boolean {
    return this.locked;
  }

  public setPosition(value: number): void {
    console.log(`[HScrollService] setPosition(${value}) locked=${this.locked} current=${this.horizontalPosition()}`);
    if (this.locked) {
      console.log('[HScrollService] BLOCKED - service is locked');
      return;
    }
    if (this.horizontalPosition() !== value) {
      console.log(`[HScrollService] Setting position to ${value}`);
      this.horizontalPosition.set(value);
    }
  }

  public forceSetPosition(value: number): void {
    console.log(`[HScrollService] forceSetPosition(${value})`);
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
