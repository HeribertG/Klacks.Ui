import { inject, Injectable } from '@angular/core';
import { CanvasManagerService } from './canvas-manager.service';
import { SettingsService } from './settings.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { CreateHeaderService } from './create-header.service';
import { CreateCellService } from './create-cell.service';
import { MyPosition } from 'src/app/grid/classes/position';
import { DataService } from './data.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';

@Injectable({
  providedIn: 'root',
})
export class GridRenderService {
  private canvasManager = inject(CanvasManagerService);
  private settings = inject(SettingsService);
  private gridColors = inject(GridColorService);
  private createHeader = inject(CreateHeaderService);
  private createCell = inject(CreateCellService);
  private gridData = inject(DataService);
  private scroll = inject(ScrollService);

  public drawGrid(
    visibleRow: number,
    visibleCol: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    this.resizeRenderCanvas(visibleRow, visibleCol);

    for (let row = 0; row < visibleRow; row++) {
      for (let col = 0; col < visibleCol; col++) {
        this.addCell(row, col, firstVisibleRow, firstVisibleCol);
      }
    }
    this.renderGrid();
  }

  public renderGrid(): void {
    this.renderBody();
    this.renderHeader();
  }

  public renderBody() {
    const ctx = this.canvasManager.ctx;
    const canvas = this.canvasManager.canvas;
    const renderCanvas = this.canvasManager.renderCanvas;

    if (!ctx || !canvas || !renderCanvas) {
      return;
    }

    const pixelRatio = DrawHelper.pixelRatio();

    const renderWidth = Math.round(renderCanvas.width / pixelRatio);
    const renderHeight = Math.round(renderCanvas.height / pixelRatio);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      renderCanvas,
      0,
      0,
      renderCanvas.width,
      renderCanvas.height,
      0,
      this.settings.cellHeaderHeight,
      renderWidth,
      renderHeight
    );
  }

  public renderHeader() {
    const ctx = this.canvasManager.ctx;
    const headerCanvas = this.canvasManager.headerCanvas;

    if (!ctx || !headerCanvas) {
      return;
    }
    const alignment =
      this.scroll.horizontalScrollPosition * this.settings.cellWidth * -1;
    if (headerCanvas.width > 0 && headerCanvas.height > 0) {
      ctx.drawImage(headerCanvas, alignment, 0);
    }
  }

  public drawGridHeader(columns: number): void {
    const headerCanvas = this.canvasManager.headerCanvas;
    const headerCtx = this.canvasManager.headerCtx;

    if (!headerCanvas || !headerCtx) {
      console.error('Header canvas context is not available');
      return;
    }

    headerCanvas.height =
      this.settings.cellHeaderHeight + this.settings.increaseBorder;
    headerCanvas.width = columns * this.settings.cellWidth;

    for (let col = 0; col < columns; col++) {
      const imgHeader = this.createHeader.createHeader(col);
      if (imgHeader) {
        headerCtx.putImageData(imgHeader, col * this.settings.cellWidth, 0);
      }
    }
  }

  public drawGridSelectedCell(
    position: MyPosition,
    isFocused: boolean,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx || !position || position.isEmpty()) return;

    ctx.save();
    ctx.rect(
      0,
      this.settings.cellHeaderHeight,
      this.canvasManager.canvas!.width,
      this.canvasManager.renderCanvas!.height - this.settings.cellHeaderHeight
    );
    ctx.clip();

    if (isFocused) {
      ctx.strokeStyle = this.gridColors.focusBorderColor;
      ctx.setLineDash([]);
    } else {
      ctx.setLineDash([1, 2]);
      ctx.strokeStyle = 'grey';
    }

    const col: number =
      (position.column - firstVisibleCol) * this.settings.cellWidth;
    const row: number =
      (position.row - firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    ctx.strokeRect(
      col - 1,
      row - 1,
      this.settings.cellWidth + 3,
      this.settings.cellHeight + 1
    );
    ctx.restore();
  }

  public drawSelection(
    positions: MyPosition[],
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

    for (const pos of positions) {
      this.drawSelectedCellBackground(
        pos.column,
        pos.row,
        firstVisibleRow,
        firstVisibleCol
      );
    }

    ctx.restore();
  }

  public drawGridSelectedHeaderCell(
    position: MyPosition | null,
    firstVisibleCol: number
  ): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx || !position || position.isEmpty()) return;

    ctx.save();
    ctx.fillStyle = this.gridColors.focusBorderColor;
    ctx.globalAlpha = 0.2;
    const col: number =
      (position.column - firstVisibleCol) * this.settings.cellWidth;

    ctx.fillRect(
      col,
      0,
      this.settings.cellWidth,
      this.settings.cellHeaderHeight
    );
    ctx.restore();
  }

  private resizeRenderCanvas(visibleRow: number, visibleCol: number): void {
    this.canvasManager.resizeRenderCanvas(visibleRow, visibleCol);
  }

  private addCell(
    row: number,
    col: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const tmpRow: number = row + firstVisibleRow;
    const tmpCol: number = col + firstVisibleCol;
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;

    if (
      tmpRow < 0 ||
      tmpRow >= this.gridData.rows ||
      tmpCol < 0 ||
      tmpCol >= this.gridData.columns
    ) {
      //Cell index outside the valid limits.'
      return;
    }

    if (tmpRow < this.gridData.rows && tmpCol < this.gridData.columns) {
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

  private drawSelectedCellBackground(
    col: number,
    row: number,
    firstVisibleRow: number,
    firstVisibleCol: number
  ): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx) return;

    const column: number = (col - firstVisibleCol) * this.settings.cellWidth;
    const rowSet: number =
      (row - firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    ctx.fillRect(
      column,
      rowSet,
      this.settings.cellWidth,
      this.settings.cellHeight
    );
  }
}
