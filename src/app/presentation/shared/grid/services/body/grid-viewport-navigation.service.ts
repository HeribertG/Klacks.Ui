// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Moves the selected grid cell and the visible viewport: keyboard navigation (arrows, page, home/end) with a
 * repeat throttle per direction, and the accelerating auto-scroll while a rubber band selection is dragged against
 * a viewport edge. Provided per grid canvas by GridTemplateEventsDirective, which keeps the DOM event handling.
 * @param gridSurface - GridSurfaceTemplateComponent holding the selected position and the scrollbar outputs
 * @param gridData - BaseDataService for the row and column counts
 * @param gridSettings - BaseSettingsService for cell and header size
 * @param scrollGrid - ScrollService for the current scroll positions and visible counts
 */
import { Injectable, inject } from '@angular/core';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridSurfaceTemplateComponent } from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';

const REPEAT_DELAY_MS = 100;
const INDEX_CORRECTION = 1;
const DRAG_SCROLL_INITIAL_INTERVAL_MS = 220;
const DRAG_SCROLL_MIN_INTERVAL_MS = 25;
const DRAG_SCROLL_DECAY_TAU_MS = 700;

type RepeatDirection = 'right' | 'left' | 'up' | 'down' | 'pageDown' | 'pageUp';

@Injectable()
export class GridViewportNavigationService {
  private gridSurface = inject(GridSurfaceTemplateComponent);
  private gridData = inject(BaseDataService);
  private gridSettings = inject(BaseSettingsService);
  private scrollGrid = inject(ScrollService);

  private edgeEnterTime: number | null = null;
  private lastScrollEmitTime = 0;
  private lastRepeatTimes: Record<RepeatDirection, number> = this.createRepeatClocks();

  moveDown(isRepeat: boolean): void {
    if (this.isThrottled('down', isRepeat)) {
      return;
    }
    this.goDown();
  }

  moveUp(isRepeat: boolean): void {
    if (this.isThrottled('up', isRepeat)) {
      return;
    }
    this.goUp();
  }

  moveLeft(isRepeat: boolean): void {
    if (this.isThrottled('left', isRepeat)) {
      return;
    }
    this.goLeft();
  }

  moveRight(isRepeat: boolean): void {
    if (this.isThrottled('right', isRepeat)) {
      return;
    }
    this.goRight();
  }

  pageDown(isRepeat: boolean): void {
    if (this.isThrottled('pageDown', isRepeat)) {
      return;
    }
    this.goPageDown();
  }

  pageUp(isRepeat: boolean): void {
    if (this.isThrottled('pageUp', isRepeat)) {
      return;
    }
    this.goPageUp();
  }

  moveToEnd(): void {
    let lastRow: number = this.scrollGrid.maxRows;

    if (this.scrollGrid.maxRows <= 1) {
      lastRow = 0;
    }

    if (this.gridSurface.drawSchedule.position) {
      this.gridSurface.drawSchedule.position = new MyPosition(
        this.gridData.rows - 1,
        this.gridSurface.drawSchedule.position.column
      );
    }

    this.gridSurface.valueVScrollbar.emit(lastRow);
  }

  moveToHome(): void {
    const firstRow = 0;
    this.gridSurface.valueVScrollbar.emit(firstRow);
  }

  resetRepeatClocks(): void {
    this.lastRepeatTimes = this.createRepeatClocks();
  }

  scrollOnPoint(pos: MyPosition): void {
    const hScrollPos = this.scrollGrid.horizontalScrollPosition;
    const vScrollPos = this.scrollGrid.verticalScrollPosition;
    const lastVisibleColumn = hScrollPos + this.scrollGrid.visibleCols - 1;
    const lastVisibleRow = vScrollPos + this.fullyVisibleBodyRows() - 1;

    const atLeftEdge = hScrollPos > 0 && pos.column <= hScrollPos;
    const atRightEdge = pos.column >= lastVisibleColumn;
    const atTopEdge = vScrollPos > 0 && pos.row <= vScrollPos;
    const atBottomEdge = pos.row >= lastVisibleRow;

    if (!atLeftEdge && !atRightEdge && !atTopEdge && !atBottomEdge) {
      this.edgeEnterTime = null;
      return;
    }

    const now = Date.now();
    if (this.edgeEnterTime === null) {
      this.edgeEnterTime = now;
      this.lastScrollEmitTime = 0;
    }

    const elapsed = now - this.edgeEnterTime;
    const interval =
      DRAG_SCROLL_MIN_INTERVAL_MS +
      (DRAG_SCROLL_INITIAL_INTERVAL_MS - DRAG_SCROLL_MIN_INTERVAL_MS) * Math.exp(-elapsed / DRAG_SCROLL_DECAY_TAU_MS);

    if (now - this.lastScrollEmitTime < interval) {
      return;
    }

    this.lastScrollEmitTime = now;

    if (atLeftEdge) {
      this.gridSurface.valueHScrollbar.emit(hScrollPos - 1);
    } else if (atRightEdge) {
      this.gridSurface.valueHScrollbar.emit(hScrollPos + 1);
    }

    if (atTopEdge) {
      this.gridSurface.valueVScrollbar.emit(vScrollPos - 1);
    } else if (atBottomEdge) {
      this.gridSurface.valueVScrollbar.emit(vScrollPos + 1);
    }
  }

  private createRepeatClocks(): Record<RepeatDirection, number> {
    return { right: 0, left: 0, up: 0, down: 0, pageDown: 0, pageUp: 0 };
  }

  private isThrottled(direction: RepeatDirection, isRepeat: boolean): boolean {
    if (!isRepeat) {
      return false;
    }
    const now = Date.now();
    if (now - this.lastRepeatTimes[direction] < REPEAT_DELAY_MS) {
      return true;
    }
    this.lastRepeatTimes[direction] = now;
    return false;
  }

  private goRight(): void {
    if (
      this.gridSurface.drawSchedule.position &&
      this.gridSurface.drawSchedule.position.column < this.gridData.columns - 1
    ) {
      const nextColumn: number = this.gridSurface.drawSchedule.position.column + 1;

      this.gridSurface.drawSchedule.position = new MyPosition(
        this.gridSurface.drawSchedule.position.row,
        nextColumn
      );

      if (
        this.gridSurface.drawSchedule.position.column >=
        this.scrollGrid.horizontalScrollPosition + this.scrollGrid.visibleCols - 1
      ) {
        this.gridSurface.valueHScrollbar.emit(this.scrollGrid.horizontalScrollPosition + 1);
      }
    }
  }

  private goLeft(): void {
    if (this.gridSurface.drawSchedule.position && this.gridSurface.drawSchedule.position.column > 0) {
      const previousColumn: number = this.gridSurface.drawSchedule.position.column - 1;
      this.gridSurface.drawSchedule.position = new MyPosition(
        this.gridSurface.drawSchedule.position.row,
        previousColumn
      );

      if (this.gridSurface.drawSchedule.position.column < this.scrollGrid.horizontalScrollPosition) {
        this.gridSurface.valueHScrollbar.emit(previousColumn);
        this.gridSurface.drawSchedule.drawGridSelectedCell();
      }
    }
  }

  private goUp(): void {
    if (this.gridSurface.drawSchedule.position && this.gridSurface.drawSchedule.position.row > 0) {
      const previousRow = this.gridSurface.drawSchedule.position.row - 1;

      this.gridSurface.drawSchedule.position = new MyPosition(
        previousRow,
        this.gridSurface.drawSchedule.position.column
      );

      if (previousRow < this.scrollGrid.verticalScrollPosition) {
        this.gridSurface.valueVScrollbar.emit(this.scrollGrid.verticalScrollPosition - 1);
      }
    }
  }

  private goDown(): void {
    if (
      this.gridSurface.drawSchedule.position &&
      this.gridSurface.drawSchedule.position.row < this.gridData.rows
    ) {
      this.gridSurface.drawSchedule.position = new MyPosition(
        this.gridSurface.drawSchedule.position.row + INDEX_CORRECTION,
        this.gridSurface.drawSchedule.position.column
      );

      const currentVerticalRow = this.gridSurface.drawSchedule.position.row;
      const firstVisibleRow = this.scrollGrid.verticalScrollPosition;
      const lastFullyVisibleRow = firstVisibleRow + this.fullyVisibleBodyRows() - 1;

      if (lastFullyVisibleRow <= currentVerticalRow) {
        this.gridSurface.valueVScrollbar.emit(firstVisibleRow + 1);
      }
    }
  }

  private fullyVisibleBodyRows(): number {
    const cellHeight = this.gridSettings.cellHeight;
    if (cellHeight <= 0) return 1;
    const headerHeight = this.gridSettings.hasHeader ? this.gridSettings.cellHeaderHeight : 0;
    const bodyHeight = this.gridSurface.drawSchedule.height - headerHeight;
    return Math.max(1, Math.floor(bodyHeight / cellHeight));
  }

  private goPageDown(): void {
    let nextVisibleRow: number = this.scrollGrid.verticalScrollPosition + this.fullyVisibleBodyRows() - 1;

    if (nextVisibleRow > this.gridData.rows) {
      nextVisibleRow = this.gridData.rows - 2;
    }

    let nextRow = 0;
    if (this.scrollGrid.maxRows <= 1) {
      this.scrollGrid.verticalScrollPosition = 0;
    } else if (this.scrollGrid.maxRows >= nextVisibleRow) {
      nextRow = nextVisibleRow;
    } else {
      nextRow = this.scrollGrid.maxRows;
    }

    if (this.gridSurface.drawSchedule.position) {
      this.gridSurface.drawSchedule.position = new MyPosition(
        nextVisibleRow,
        this.gridSurface.drawSchedule.position.column
      );
    }

    this.gridSurface.valueVScrollbar.emit(nextRow);
    this.gridSurface.drawSchedule.drawGridSelectedCell();
  }

  private goPageUp(): void {
    let previousRow: number = this.scrollGrid.verticalScrollPosition - this.scrollGrid.visibleRows + 1;

    if (previousRow < 0) {
      previousRow = 0;
    }

    if (this.scrollGrid.maxRows <= 1) {
      previousRow = 0;
    }

    if (this.gridSurface.drawSchedule.position) {
      this.gridSurface.drawSchedule.position = new MyPosition(
        previousRow,
        this.gridSurface.drawSchedule.position.column
      );
    }

    this.gridSurface.valueVScrollbar.emit(previousRow);
    this.gridSurface.drawSchedule.drawGridSelectedCell();
  }
}
