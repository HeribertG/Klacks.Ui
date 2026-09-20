// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Turns continuous pan pixels of a finger gesture into whole-cell scroll steps for the canvas grids,
 * which can only scroll by whole rows and columns. Pixels below one cell are kept as a remainder so
 * a slow drag still advances instead of being rounded away, and the sign is inverted because the
 * finger moves the content while the scroll position describes the viewport.
 */
export interface TouchPanCells {
  columns: number;
  rows: number;
}

const NO_STEPS: TouchPanCells = { columns: 0, rows: 0 };

export class TouchPanAccumulator {
  private remainderX = 0;
  private remainderY = 0;

  consume(dx: number, dy: number, cellWidth: number, cellHeight: number): TouchPanCells {
    if (cellWidth <= 0 || cellHeight <= 0) {
      return NO_STEPS;
    }

    this.remainderX -= dx;
    this.remainderY -= dy;

    const columns = Math.trunc(this.remainderX / cellWidth);
    this.remainderX -= columns * cellWidth;

    const rows = Math.trunc(this.remainderY / cellHeight);
    this.remainderY -= rows * cellHeight;

    return { columns, rows };
  }

  reset(): void {
    this.remainderX = 0;
    this.remainderY = 0;
  }
}
