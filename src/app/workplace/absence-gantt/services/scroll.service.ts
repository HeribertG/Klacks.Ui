import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class ScrollService {
  public moveHorizontalEvent = new Subject<number>();
  public moveVerticalEvent = new Subject<number>();

  public maxCols = 0;
  public maxRows = 0;

  private _horizontalScrollDelta = 0;
  private _verticalScrollDelta = 0;
  private _verticalScrollPosition = 0;
  private _horizontalScrollPosition = 0;
  private _visibleCols = 0;
  private _visibleRows = 0;

  set verticalScrollPosition(value: number) {
    if (this._verticalScrollPosition !== value) {
      let oldValue: number = this._verticalScrollPosition;
      oldValue = Math.max(0, oldValue);

      this._verticalScrollPosition = Math.max(0, Math.min(value, this.maxRows));

      oldValue
        ? this.difference(oldValue, false)
        : (this._verticalScrollDelta = 0);
    }
  }

  get verticalScrollPosition() {
    return this._verticalScrollPosition;
  }

  set horizontalScrollPosition(value: number) {
    if (this._horizontalScrollPosition !== value) {
      let oldValue: number = this._horizontalScrollPosition;
      oldValue = Math.max(0, oldValue);

      this._horizontalScrollPosition = Math.max(
        0,
        Math.min(value, this.maxCols)
      );

      oldValue
        ? this.difference(oldValue, true)
        : (this._horizontalScrollDelta = 0);
    }
  }

  get horizontalScrollPosition() {
    return this._horizontalScrollPosition;
  }

  resetScrollPosition(): void {
    this._horizontalScrollPosition = 0;
    this._verticalScrollPosition = 0;
  }

  private difference(oldValue: number, isHorizontal: boolean) {
    if (isHorizontal) {
      this._horizontalScrollDelta = oldValue - this._horizontalScrollPosition;
    } else {
      this._verticalScrollDelta = oldValue - this._verticalScrollPosition;
    }
  }

  get horizontalScrollDelta(): number {
    return this._horizontalScrollDelta;
  }
  get verticalScrollDelta(): number {
    return this._verticalScrollDelta;
  }

  get visibleCols(): number {
    return this._visibleCols;
  }

  get visibleRows(): number {
    return this._visibleRows;
  }

  set visibleCols(value: number) {
    this._visibleCols = value;
  }

  set visibleRows(value: number) {
    this._visibleRows = value;
  }

  updateHorizontalScrollPosition(value: number): void {
    this.moveHorizontalEvent.next(value);
  }
  updateVerticalScrollPosition(value: number): void {
    this.moveVerticalEvent.next(value);
  }
}
