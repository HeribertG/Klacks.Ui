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
        this.canvasManager.renderCanvasCtx.drawImage(
          img,
          col * cellWidth,
          row * cellHeight,
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
    diff: number,
    directionX: number,
    directionY: number,
    visibleRows: number,
    visibleCols: number,
    oldFirstVisibleRow: number, // ALTE Positionen
    oldFirstVisibleCol: number // ALTE Positionen
  ): void {
    let startCol: number;
    let endCol: number;

    if (diff > 0) {
      startCol = visibleCols - diff;
      endCol = visibleCols;
    } else {
      startCol = 0;
      endCol = Math.abs(diff);
    }

    // Die NEUEN Positionen berechnen
    const newFirstVisibleRow = oldFirstVisibleRow + directionY;
    const newFirstVisibleCol = oldFirstVisibleCol + directionX;

    this.renderCellRange(
      0,
      visibleRows,
      startCol,
      endCol,
      newFirstVisibleRow,
      newFirstVisibleCol
    );
  }

  public updateCellsForVerticalScroll(
    diff: number,
    directionX: number,
    directionY: number,
    visibleRows: number,
    visibleCols: number,
    oldFirstVisibleRow: number, // ALTE Positionen
    oldFirstVisibleCol: number // ALTE Positionen
  ): void {
    let startRow: number;
    let endRow: number;

    if (diff > 0) {
      startRow = 0;
      endRow = diff;
    } else {
      startRow = visibleRows + diff;
      endRow = visibleRows;
    }

    // Die NEUEN Positionen berechnen
    const newFirstVisibleRow = oldFirstVisibleRow + directionY;
    const newFirstVisibleCol = oldFirstVisibleCol + directionX;

    this.renderCellRange(
      startRow,
      endRow,
      0,
      visibleCols,
      newFirstVisibleRow,
      newFirstVisibleCol
    );
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
