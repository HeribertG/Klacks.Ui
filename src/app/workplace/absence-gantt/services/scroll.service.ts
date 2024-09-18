import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class ScrollService {
  public moveHorizontalEvent = new Subject<number>();
  public moveVerticalEvent = new Subject<number>();

  public rowPercent = 0;
  public colPercent = 0;
  public maxCols = 0;
  public maxRows = 0;

  private _lastDifferenceX = 0;
  private _lastDifferenceY = 0;
  private _vScrollValue = 0;
  private _hScrollValue = 0;
  private _visibleCols = 0;
  private _visibleRows = 0;
  private _gapAfterEndRows = 3;
  private _gapAfterEndCols = 3;

  set vScrollValue(value: number) {
    if (this._vScrollValue !== value) {
      let oldValue: number = this._vScrollValue;
      oldValue = Math.max(0, oldValue);

      this._vScrollValue = Math.max(0, Math.min(value, this.maxRows));

      oldValue ? this.difference(oldValue, false) : (this._lastDifferenceY = 0);
    }
  }

  get vScrollValue() {
    return this._vScrollValue;
  }

  set hScrollValue(value: number) {
    if (this._hScrollValue !== value) {
      let oldValue: number = this._hScrollValue;
      oldValue = Math.max(0, oldValue);

      this._hScrollValue = Math.max(0, Math.min(value, this.maxCols));

      oldValue ? this.difference(oldValue, true) : (this._lastDifferenceX = 0);
    }
  }

  get hScrollValue() {
    return this._hScrollValue;
  }

  resetScrollPosition(): void {
    this._hScrollValue = 0;
    this._vScrollValue = 0;
  }

  private difference(oldValue: number, isHorizontal: boolean) {
    if (isHorizontal) {
      this._lastDifferenceX = oldValue - this._hScrollValue;
    } else {
      this._lastDifferenceY = oldValue - this._vScrollValue;
    }
  }

  get lastDifferenceX(): number {
    return this._lastDifferenceX;
  }
  get lastDifferenceY(): number {
    return this._lastDifferenceY;
  }

  get visibleCols(): number {
    return this._visibleCols;
  }

  get visibleRows(): number {
    return this._visibleRows;
  }

  setMetrics(
    visibleCols: number,
    cols: number,
    visibleRows: number,
    rows: number
  ) {
    this.colPercent = 0;
    this.rowPercent = 0;

    this.maxCols = cols - visibleCols + this._gapAfterEndCols;
    this.maxCols = Math.max(0, this.maxCols);

    this.maxRows = rows - visibleRows + this._gapAfterEndRows;
    this.maxRows = Math.max(0, this.maxRows);

    if (this.maxRows > 0 && rows > 0) {
      this.rowPercent = rows / this.maxRows;
    }

    if (this.maxCols > 0 && cols > 0) {
      this.colPercent = cols / this.maxCols;
    }

    this._visibleCols = visibleCols;
    this._visibleRows = visibleRows;
  }

  isMoveHorizontal(value: number): void {
    this.moveHorizontalEvent.next(value);
  }
  isMoveVertical(value: number): void {
    this.moveVerticalEvent.next(value);
  }
}
