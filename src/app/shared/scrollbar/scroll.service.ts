import { Injectable, signal } from '@angular/core';

interface ScrollState {
  position: { horizontal: number; vertical: number };
  delta: { horizontal: number; vertical: number };
  max: { cols: number; rows: number };
  visible: { cols: number; rows: number };
}

@Injectable()
export class ScrollService {
  public lockedCols = signal<boolean>(false);
  public lockedRows = signal<boolean>(false);

  private _maxCols = 0;
  private _maxRows = 0;
  private _horizontalScrollDelta = 0;
  private _verticalScrollDelta = 0;
  private _verticalScrollPosition = 0;
  private _horizontalScrollPosition = 0;
  private _visibleCols = 0;
  private _visibleRows = 0;

  get visibleCols(): number {
    return this._visibleCols;
  }

  set visibleCols(value: number) {
    this._visibleCols = value;
    this.calcLockedCols();
  }

  get visibleRows(): number {
    return this._visibleRows;
  }

  set visibleRows(value: number) {
    this._visibleRows = value;
    this.calcLockedRows();
  }

  get maxCols(): number {
    return this._maxCols;
  }

  set maxCols(value: number) {
    this._maxCols = Math.max(0, value);
    this.calcLockedCols();
  }

  get maxRows(): number {
    return this._maxRows;
  }

  set maxRows(value: number) {
    this._maxRows = Math.max(0, value);
    this.calcLockedRows();
  }

  set verticalScrollPosition(value: number) {
    if (this._verticalScrollPosition === value) return;

    const oldValue = this._verticalScrollPosition;
    this._verticalScrollPosition = Math.max(0, Math.min(value, this.maxRows));
    this._verticalScrollDelta += this._verticalScrollPosition - oldValue;
  }

  get verticalScrollPosition() {
    return this._verticalScrollPosition;
  }

  set horizontalScrollPosition(value: number) {
    if (this._horizontalScrollPosition === value) return;

    const oldValue = this._horizontalScrollPosition;
    this._horizontalScrollPosition = Math.max(0, Math.min(value, this.maxCols));

    this._horizontalScrollDelta += this._horizontalScrollPosition - oldValue;
  }

  get horizontalScrollPosition() {
    return this._horizontalScrollPosition;
  }

  updateScrollPosition(
    horizontal?: number,
    vertical?: number
  ): {
    horizontalDelta: number;
    verticalDelta: number;
  } {
    const oldH = this._horizontalScrollPosition;
    const oldV = this._verticalScrollPosition;

    if (horizontal !== undefined) {
      this._horizontalScrollPosition = Math.max(
        0,
        Math.min(horizontal, this.maxCols)
      );
    }
    if (vertical !== undefined) {
      this._verticalScrollPosition = Math.max(
        0,
        Math.min(vertical, this.maxRows)
      );
    }

    const deltaH = this._horizontalScrollPosition - oldH;
    const deltaV = this._verticalScrollPosition - oldV;

    this._horizontalScrollDelta += deltaH;
    this._verticalScrollDelta += deltaV;

    return {
      horizontalDelta: deltaH,
      verticalDelta: deltaV,
    };
  }

  public resetScrollPosition(): void {
    this._horizontalScrollPosition = 0;
    this._verticalScrollPosition = 0;
    this._horizontalScrollDelta = 0;
    this._verticalScrollDelta = 0;
  }

  public resetDeltas(): void {
    this._horizontalScrollDelta = 0;
    this._verticalScrollDelta = 0;
  }

  get horizontalScrollDelta(): number {
    return this._horizontalScrollDelta;
  }

  get verticalScrollDelta(): number {
    return this._verticalScrollDelta;
  }

  getScrollState(): ScrollState {
    return {
      position: {
        horizontal: this._horizontalScrollPosition,
        vertical: this._verticalScrollPosition,
      },
      delta: {
        horizontal: this._horizontalScrollDelta,
        vertical: this._verticalScrollDelta,
      },
      max: {
        cols: this.maxCols,
        rows: this.maxRows,
      },
      visible: {
        cols: this._visibleCols,
        rows: this._visibleRows,
      },
    };
  }

  private calcLockedCols() {
    this.lockedCols.set(false);
    const maxScrollH = Math.max(0, this._maxCols - this._visibleCols);
    this.lockedCols.set(maxScrollH === 0);
  }

  private calcLockedRows() {
    this.lockedRows.set(false);
    const maxScrollV = Math.max(0, this._maxRows - this._visibleRows);
    this.lockedRows.set(maxScrollV === 0);
  }
}
