// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal } from '@angular/core';

@Injectable()
export class AvailabilitySelectionService {
  selectedRow = signal(-1);
  selectedCol = signal(-1);

  hasSelection(): boolean {
    return this.selectedRow() >= 0 && this.selectedCol() >= 0;
  }

  select(row: number, col: number): void {
    this.selectedRow.set(row);
    this.selectedCol.set(col);
  }

  clearSelection(): void {
    this.selectedRow.set(-1);
    this.selectedCol.set(-1);
  }

  moveUp(): boolean {
    if (this.selectedRow() <= 0) return false;
    this.selectedRow.update((r) => r - 1);
    return true;
  }

  moveDown(maxRows: number): boolean {
    if (this.selectedRow() >= maxRows - 1) return false;
    this.selectedRow.update((r) => r + 1);
    return true;
  }

  moveLeft(): boolean {
    if (this.selectedCol() <= 0) return false;
    this.selectedCol.update((c) => c - 1);
    return true;
  }

  moveRight(maxCols: number): boolean {
    if (this.selectedCol() >= maxCols - 1) return false;
    this.selectedCol.update((c) => c + 1);
    return true;
  }

  jumpToRow(row: number, maxRows: number): void {
    this.selectedRow.set(Math.max(0, Math.min(row, maxRows - 1)));
  }
}
