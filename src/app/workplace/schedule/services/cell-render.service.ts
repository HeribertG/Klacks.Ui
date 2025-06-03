import { Injectable } from '@angular/core';
import { CanvasManagerService } from './canvas-manager.service';
import { DataService } from './data.service';
import { SettingsService } from './settings.service';
import { CreateCellService } from './create-cell.service';
import { MyPosition } from 'src/app/grid/classes/position';

@Injectable({
  providedIn: 'root',
})
export class CellRenderService {
  constructor(
    private canvasManager: CanvasManagerService,
    private dataService: DataService,
    private settings: SettingsService,
    private createCell: CreateCellService
  ) {}

  private renderCell(
    row: number,
    col: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const tmpRow: number = row + firstVisibleRow;
    const tmpCol: number = col + firstVisibleCol;

    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;

    if (this.isValidCellIndex(tmpRow, tmpCol)) {
      const img = this.createCell.createCell(tmpRow, tmpCol);
      if (img && this.canvasManager.renderCanvasCtx) {
        const drawX = col * cellWidth;
        const drawY = row * cellHeight;
        this.canvasManager.renderCanvasCtx.drawImage(
          img,
          drawX,
          drawY,
          cellWidth,
          cellHeight
        );
      }
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
      for (let col = startCol; col < endCol; col++) {
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
      startCol = Math.max(0, visibleCols - horizontalDiff);
      endCol = visibleCols;
    } else {
      startCol = 0;
      endCol = Math.min(visibleCols, Math.abs(horizontalDiff));
    }

    const maxDataCol = this.dataService.columns;
    for (let row = 0; row < visibleRows; row++) {
      for (let col = startCol; col < endCol; col++) {
        const absoluteCol = col + newFirstVisibleCol;
        const absoluteRow = row + newFirstVisibleRow;

        if (
          absoluteCol >= 0 &&
          absoluteCol < maxDataCol &&
          absoluteRow >= 0 &&
          absoluteRow < this.dataService.rows
        ) {
          this.renderCell(row, col, newFirstVisibleRow, newFirstVisibleCol);
        }
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
      startRow = Math.max(0, visibleRows - verticalDiff);
      endRow = visibleRows;
    } else {
      startRow = 0;
      endRow = Math.min(visibleRows, Math.abs(verticalDiff));
    }

    const maxDataRow = this.dataService.rows;
    for (let col = 0; col < visibleCols; col++) {
      for (let row = startRow; row < endRow; row++) {
        const absoluteRow = row + newFirstVisibleRow;
        const absoluteCol = col + newFirstVisibleCol;

        if (
          absoluteRow >= 0 &&
          absoluteRow < maxDataRow &&
          absoluteCol >= 0 &&
          absoluteCol < this.dataService.columns
        ) {
          this.renderCell(row, col, newFirstVisibleRow, newFirstVisibleCol);
        }
      }
    }
  }

  public addCells(
    visibleRows: number,
    visibleCols: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    this.renderCellRange(
      0,
      visibleRows,
      0,
      visibleCols,
      firstVisibleRow,
      firstVisibleCol
    );
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
