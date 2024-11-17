import { Injectable } from '@angular/core';

@Injectable()
export class ScrollService {
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
      console.log(
        'verticalScrollPosition',
        value,
        this._verticalScrollPosition
      );
      let oldValue: number = this._verticalScrollPosition;
      oldValue = Math.max(0, oldValue);

      this._verticalScrollPosition = Math.max(0, Math.min(value, this.maxRows));

      this.difference(oldValue, false);
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

      this.difference(oldValue, true);
    }
  }

  get horizontalScrollPosition() {
    return this._horizontalScrollPosition;
  }

  resetScrollPosition(): void {
    this._horizontalScrollPosition = 0;
    this._verticalScrollPosition = 0;
    this._horizontalScrollDelta = 0;
    this._verticalScrollDelta = 0;
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
}
