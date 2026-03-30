// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCanvasManagerService } from 'src/app/presentation/shared/grid/services/body/canvas-manager.service';
import { BaseCreateCellService } from './create-cell.service';
import { GridCoordinateService } from 'src/app/presentation/shared/grid/services/grid-coordinate.service';

@Injectable({
  providedIn: 'root',
})
export class BaseCellRenderService {
  protected canvasManager = inject(BaseCanvasManagerService);
  protected dataService = inject(BaseDataService);
  protected settings = inject(BaseSettingsService);
  protected createCell = inject(BaseCreateCellService);
  protected coord = inject(GridCoordinateService);

  private static readonly OVERLAP = 1;

  private renderCell(
    row: number,
    col: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const tmpRow: number = row + firstVisibleRow;
    const tmpCol: number = col + firstVisibleCol;

    if (!this.isValidCellIndex(tmpRow, tmpCol)) {
      return;
    }

    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;

    const gridCell = this.dataService.getCell(tmpRow, tmpCol);
    const span = gridCell?.colSpan || 1;

    const img = this.createCell.createCell(tmpRow, tmpCol);
    if (img && this.canvasManager.renderCanvasCtx) {
      const drawX = this.coord.cellX(col);
      const drawY = row * cellHeight;
      const drawWidth = span * cellWidth;
      this.canvasManager.renderCanvasCtx.drawImage(
        img,
        drawX,
        drawY,
        drawWidth,
        cellHeight
      );
    }
  }

  private renderCellRange(
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    for (let row = startRow; row < endRow; row++) {
      let skipUntilCol = -1;
      for (let col = startCol; col < endCol; col++) {
        if (col < skipUntilCol) continue;

        const tmpCol = col + firstVisibleCol;
        const tmpRow = row + firstVisibleRow;

        if (this.isValidCellIndex(tmpRow, tmpCol)) {
          const gridCell = this.dataService.getCell(tmpRow, tmpCol);
          if (gridCell && gridCell.colSpan > 1) {
            skipUntilCol = col + gridCell.colSpan;
          }
        }

        this.renderCell(row, col, firstVisibleRow, firstVisibleCol);
      }
    }
  }

  public updateCellsForHorizontalScroll(
    horizontalDiff: number,
    visibleRows: number,
    visibleCols: number,
    newFirstVisibleRow: number,
    newFirstVisibleCol: number
  ): void {
    if (horizontalDiff === 0) return;

    let startCol: number;
    let endCol: number;

    if (horizontalDiff > 0) {
      startCol = Math.max(
        0,
        visibleCols - horizontalDiff - BaseCellRenderService.OVERLAP
      );
      endCol = visibleCols;
    } else {
      const absDiff = Math.abs(horizontalDiff);
      startCol = 0;
      endCol = Math.min(visibleCols, absDiff + BaseCellRenderService.OVERLAP);
    }


    for (let row = 0; row < visibleRows; row++) {
      let skipUntilCol = -1;
      for (let col = startCol; col < endCol; col++) {
        if (col < skipUntilCol) continue;

        const tmpCol = col + newFirstVisibleCol;
        const tmpRow = row + newFirstVisibleRow;
        if (this.isValidCellIndex(tmpRow, tmpCol)) {
          const gridCell = this.dataService.getCell(tmpRow, tmpCol);
          if (gridCell && gridCell.colSpan > 1) {
            skipUntilCol = col + gridCell.colSpan;
          }
        }

        this.renderCell(row, col, newFirstVisibleRow, newFirstVisibleCol);
      }
    }
  }

  public updateCellsForVerticalScroll(
    verticalDiff: number,
    visibleRows: number,
    visibleCols: number,
    newFirstVisibleRow: number,
    newFirstVisibleCol: number
  ): void {
    if (verticalDiff === 0) return;

    let startRow: number;
    let endRow: number;

    if (verticalDiff > 0) {
      startRow = Math.max(
        0,
        visibleRows - verticalDiff - BaseCellRenderService.OVERLAP
      );
      endRow = visibleRows;
    } else {
      const absDiff = Math.abs(verticalDiff);
      startRow = 0;
      endRow = Math.min(visibleRows, absDiff + BaseCellRenderService.OVERLAP);
    }

    for (let row = startRow; row < endRow; row++) {
      let skipUntilCol = -1;
      for (let col = 0; col < visibleCols; col++) {
        if (col < skipUntilCol) continue;

        const tmpCol = col + newFirstVisibleCol;
        const tmpRow = row + newFirstVisibleRow;
        if (this.isValidCellIndex(tmpRow, tmpCol)) {
          const gridCell = this.dataService.getCell(tmpRow, tmpCol);
          if (gridCell && gridCell.colSpan > 1) {
            skipUntilCol = col + gridCell.colSpan;
          }
        }

        this.renderCell(row, col, newFirstVisibleRow, newFirstVisibleCol);
      }
    }
  }

  public addCells(
    visibleRows: number,
    visibleCols: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    this.clearRenderCanvas();
    this.renderCellRange(
      0,
      visibleRows,
      0,
      visibleCols,
      firstVisibleRow,
      firstVisibleCol
    );
  }

  private clearRenderCanvas(): void {
    const ctx = this.canvasManager.renderCanvasCtx;
    const canvas = this.canvasManager.renderCanvas;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  public refreshCell(
    pos: MyPosition,
    visibleRows: number,
    visibleCols: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    if (pos && !pos.isEmpty()) {
      const col: number = pos.column - firstVisibleCol;
      const row: number = pos.row - firstVisibleRow;

      if (this.isVisibleCell(row, col, visibleRows, visibleCols)) {
        this.renderCell(row, col, firstVisibleRow, firstVisibleCol);
      }
    }
  }

  public refreshVisibleCells(
    visibleRows: number,
    visibleCols: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    this.clearRenderCanvas();
    this.renderCellRange(
      0,
      visibleRows,
      0,
      visibleCols,
      firstVisibleRow,
      firstVisibleCol
    );
  }

  private isValidCellIndex(row: number, col: number): boolean {
    return (
      row >= 0 &&
      row < this.dataService.rows &&
      col >= 0 &&
      col < this.dataService.columns
    );
  }

  private isVisibleCell(
    row: number,
    col: number,
    visibleRows: number,
    visibleCols: number
  ): boolean {
    return row >= 0 && row < visibleRows && col >= 0 && col < visibleCols;
  }
}
