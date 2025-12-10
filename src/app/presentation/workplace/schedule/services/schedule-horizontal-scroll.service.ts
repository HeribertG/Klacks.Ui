import { Injectable, signal } from '@angular/core';

@Injectable()
export class ScheduleHorizontalScrollService {
  public horizontalPosition = signal<number>(0);
  public maxValue = signal<number>(0);
  public visibleValue = signal<number>(0);

  public setPosition(value: number): void {
    if (this.horizontalPosition() !== value) {
      this.horizontalPosition.set(value);
    }
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
