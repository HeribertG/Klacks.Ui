import { Injectable } from '@angular/core';
import { CanvasManagerService } from './canvas-manager.service';
import { DataService } from './data.service';
import { SettingsService } from './settings.service';
import { CreateCellService } from './create-cell.service';

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

  public renderCell(
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

  public renderCellRange(
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
    directionX: number,
    visibleRow: number,
    visibleCol: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const startCol = directionX > 0 ? visibleCol - directionX : 0;
    const endCol = directionX > 0 ? visibleCol : Math.abs(directionX);

    this.renderCellRange(
      0,
      visibleRow,
      startCol,
      endCol,
      firstVisibleRow,
      firstVisibleCol
    );
  }

  public updateCellsForVerticalScroll(
    directionY: number,
    visibleRow: number,
    visibleCol: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const startRow = directionY > 0 ? visibleRow - directionY : 0;
    const endRow = directionY > 0 ? visibleRow : Math.abs(directionY);

    this.renderCellRange(
      startRow,
      endRow,
      0,
      visibleCol,
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
}
