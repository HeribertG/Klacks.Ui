import { inject, Injectable } from '@angular/core';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCanvasManagerService } from './canvas-manager.service';
import { BaseCreateCellService } from './create-cell.service';
import { BaseCreateHeaderService } from './create-header.service';
import { GridSelectionModeEnum } from 'src/app/presentation/shared/grid/enums/divers';

@Injectable({
  providedIn: 'root',
})
export class BaseGridRenderService {
  protected canvasManager = inject(BaseCanvasManagerService);
  protected settings = inject(BaseSettingsService);
  protected gridColors = inject(GridColorService);
  protected createHeader = inject(BaseCreateHeaderService);
  protected createCell = inject(BaseCreateCellService);
  protected gridData = inject(BaseDataService);
  protected scroll = inject(ScrollService);

  public overlayRenderer?: (ctx: CanvasRenderingContext2D) => void;

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

    const cellHeaderHeight = this.settings.hasHeader
      ? this.settings.cellHeaderHeight
      : 0;
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
      cellHeaderHeight,
      renderWidth,
      renderHeight
    );

    this.overlayRenderer?.(ctx);
  }

  public renderHeader() {
    if (!this.settings.hasHeader) {
      return;
    }

    const ctx = this.canvasManager.ctx;
    const headerCanvas = this.canvasManager.headerCanvas;

    if (!ctx || !headerCanvas) {
      return;
    }
    const pixelRatio = DrawHelper.pixelRatio();
    const alignment =
      this.scroll.horizontalScrollPosition * this.settings.cellWidth * -1;
    const logicalWidth = Math.round(headerCanvas.width / pixelRatio);
    const logicalHeight = Math.round(headerCanvas.height / pixelRatio);

    if (headerCanvas.width > 0 && headerCanvas.height > 0) {
      ctx.drawImage(
        headerCanvas,
        0,
        0,
        headerCanvas.width,
        headerCanvas.height,
        alignment,
        0,
        logicalWidth,
        logicalHeight
      );
    }
  }

  public drawGridHeader(columns: number): void {
    if (!this.settings.hasHeader) {
      return;
    }
    const headerCanvas = this.canvasManager.headerCanvas;

    if (!headerCanvas || !this.canvasManager.headerCtx) {
      return;
    }

    // Resize header canvas if needed
    const expectedWidth = columns * this.settings.cellWidth;
    const expectedHeight =
      this.settings.cellHeaderHeight + this.settings.increaseBorder;
    const pixelRatio = DrawHelper.pixelRatio();

    if (
      headerCanvas.width !== expectedWidth * pixelRatio ||
      headerCanvas.height !== expectedHeight * pixelRatio
    ) {
      this.canvasManager.headerCtx = DrawHelper.createHiDPICanvas(
        headerCanvas,
        expectedWidth,
        expectedHeight,
        true
      );
      DrawHelper.setAntiAliasing(this.canvasManager.headerCtx);
    }

    const headerCtx = this.canvasManager.headerCtx;

    for (let col = 0; col < columns; col++) {
      const headerCell = this.createHeader.createHeaderCell(col);
      if (headerCell) {
        headerCtx.drawImage(
          headerCell,
          col * this.settings.cellWidth,
          0,
          this.settings.cellWidth,
          this.settings.cellHeaderHeight
        );
      }
    }

    // Draw a dark bottom border line
    headerCtx.strokeStyle = this.gridColors.borderColor;
    headerCtx.lineWidth = 1;
    headerCtx.beginPath();
    headerCtx.moveTo(0, this.settings.cellHeaderHeight - 1);
    headerCtx.lineTo(expectedWidth, this.settings.cellHeaderHeight - 1);
    headerCtx.stroke();
  }

  public drawGridSelectedCell(
    position: MyPosition,
    isFocused: boolean,
    firstVisibleRow: number,
    firstVisibleCol: number,
    showFillHandle = false
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

    const col: number =
      (position.column - firstVisibleCol) * this.settings.cellWidth;
    const row: number =
      (position.row - firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    const isRowMode = this.settings.selectionMode === GridSelectionModeEnum.Row ||
      this.settings.selectionMode === GridSelectionModeEnum.RowActiveOnly;
    const showRowHighlight = isRowMode &&
      (this.settings.selectionMode !== GridSelectionModeEnum.RowActiveOnly ||
       this.gridData.isCellActive(position.row, position.column));

    if (showRowHighlight) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = this.gridColors.focusBorderColor;
      ctx.fillRect(
        0,
        row,
        col,
        this.settings.cellHeight
      );
      const maxDataWidth = (this.gridData.columns - firstVisibleCol) * this.settings.cellWidth;
      const fillWidth = Math.max(0, maxDataWidth - col - this.settings.cellWidth);
      ctx.fillRect(
        col + this.settings.cellWidth,
        row,
        fillWidth,
        this.settings.cellHeight
      );
      ctx.globalAlpha = 1.0;
    }

    if (isFocused) {
      ctx.strokeStyle = this.gridColors.focusBorderColor;
      ctx.setLineDash([]);
    } else {
      ctx.setLineDash([1, 2]);
      ctx.strokeStyle = 'grey';
    }

    ctx.strokeRect(
      col - 1,
      row - 1,
      this.settings.cellWidth + 3,
      this.settings.cellHeight + 1
    );

    if (showFillHandle && isFocused && this.gridData.isCellDraggable(position.row, position.column)) {
      this.drawFillHandle(ctx, col, row);
    }

    ctx.restore();
  }

  private drawFillHandle(ctx: CanvasRenderingContext2D, cellX: number, cellY: number): void {
    const handleX = cellX + this.settings.cellWidth;
    const handleY = cellY + this.settings.cellHeight;
    const baseRadius = 5;
    const radius = baseRadius * this.settings.zoom;

    ctx.beginPath();
    ctx.arc(handleX, handleY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = this.gridColors.focusBorderColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * this.settings.zoom;
    ctx.stroke();
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
