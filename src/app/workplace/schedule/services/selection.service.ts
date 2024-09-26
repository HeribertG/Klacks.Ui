import { Injectable } from '@angular/core';
import { CanvasManagerService } from './canvas-manager.service';
import { SettingsService } from './settings.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { MyPosition } from 'src/app/grid/classes/position';
import { CellManipulationService } from './cell-manipulation.service';

@Injectable({
  providedIn: 'root',
})
export class SelectionService {
  constructor(
    private canvasManager: CanvasManagerService,
    private settings: SettingsService,
    private gridColors: GridColorService,
    private cellManipulation: CellManipulationService
  ) {}

  public drawSelection(firstVisibleRow: number, firstVisibleCol: number): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx) return;

    ctx.save();
    ctx.rect(
      0,
      this.settings.cellHeaderHeight,
      this.canvasManager.canvas!.width,
      this.canvasManager.renderCanvas!.height - this.settings.cellHeaderHeight
    );
    ctx.clip();

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = this.gridColors.focusBorderColor;

    for (let i = 0; i < this.cellManipulation.PositionCollection.count(); i++) {
      const pos = this.cellManipulation.PositionCollection.item(i);
      this.drawSelectedCellBackground(pos, firstVisibleRow, firstVisibleCol);
    }

    ctx.restore();
  }

  public createSelection(startPos: MyPosition, endPos: MyPosition): void {
    const minCol = Math.min(startPos.column, endPos.column);
    const maxCol = Math.max(startPos.column, endPos.column);
    const minRow = Math.min(startPos.row, endPos.row);
    const maxRow = Math.max(startPos.row, endPos.row);

    this.cellManipulation.PositionCollection.clear();

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        this.cellManipulation.PositionCollection.add(new MyPosition(row, col));
      }
    }
  }

  public destroySelection(): void {
    this.cellManipulation.PositionCollection.clear();
  }

  public isPositionInSelection(pos: MyPosition): boolean {
    return this.cellManipulation.PositionCollection.contains(pos);
  }

  public drawSelectionDynamically(
    startPos: MyPosition,
    currentPos: MyPosition,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx) return;

    ctx.save();
    ctx.rect(
      0,
      this.settings.cellHeaderHeight,
      this.canvasManager.canvas!.width,
      this.canvasManager.renderCanvas!.height - this.settings.cellHeaderHeight
    );
    ctx.clip();

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = this.gridColors.focusBorderColor;

    const minCol = Math.min(startPos.column, currentPos.column);
    const maxCol = Math.max(startPos.column, currentPos.column);
    const minRow = Math.min(startPos.row, currentPos.row);
    const maxRow = Math.max(startPos.row, currentPos.row);

    this.drawRange(
      minCol,
      maxCol,
      minRow,
      maxRow,
      firstVisibleRow,
      firstVisibleCol
    );
    ctx.restore();
  }

  private drawSelectedCellBackground(
    pos: MyPosition,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx) return;

    const column: number =
      (pos.column - firstVisibleCol) * this.settings.cellWidth;
    const rowSet: number =
      (pos.row - firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    ctx.fillRect(
      column,
      rowSet,
      this.settings.cellWidth,
      this.settings.cellHeight
    );
  }

  private drawRange(
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx) return;

    let col: number = (minCol - firstVisibleCol) * this.settings.cellWidth;
    let row: number =
      (minRow - firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    col = Math.max(0, col);
    row = Math.max(this.settings.cellHeaderHeight, row);

    let width = (maxCol - minCol + 1) * this.settings.cellWidth;
    let height = (maxRow - minRow + 1) * this.settings.cellHeight;

    width = Math.min(width, ctx.canvas.width - col);
    height = Math.min(height, ctx.canvas.height - row);

    ctx.fillRect(col, row, width, height);
  }
}
