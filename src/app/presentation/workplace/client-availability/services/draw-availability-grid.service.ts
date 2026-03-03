// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, signal } from '@angular/core';
import { AvailabilitySettingService } from './availability-setting.service';
import { AvailabilityCanvasManagerService } from './availability-canvas-manager.service';
import { RenderAvailabilityGridService } from './render-availability-grid';
import { AvailabilityCalculationService } from './render-availability-grid/availability-calculation.service';
import { AvailabilitySelectionService } from './availability-selection.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Injectable()
export class DrawAvailabilityGridService {
  private settings = inject(AvailabilitySettingService);
  private canvasManager = inject(AvailabilityCanvasManagerService);
  private renderGrid = inject(RenderAvailabilityGridService);
  private calculation = inject(AvailabilityCalculationService);
  private selection = inject(AvailabilitySelectionService);
  private gridColors = inject(GridColorService);

  public vScrollbarRefreshTrigger = signal(0);
  public hScrollbarRefreshTrigger = signal(0);
  public isFocused = false;

  private scrollX = 0;
  private scrollY = 0;
  private prevStartCol = -1;
  private prevStartRow = -1;
  private readonly MAX_INCREMENTAL_SCROLL = 4;

  public drawGrid(): void {
    if (!this.canvasManager.isCanvasAvailable()) return;

    this.renderGrid.renderHeader();
    this.renderGrid.renderGrid(this.scrollX, this.scrollY);
    this.compositeToMain();
    this.drawSelectedCell();

    this.prevStartCol = this.calculation.visibleCol(this.scrollX);
    this.prevStartRow = this.calculation.visibleRow(this.scrollY);
  }

  public moveGrid(moveX: number, moveY: number): void {
    this.scrollX = Math.floor(Math.max(0, moveX) / this.settings.cellWidth) * this.settings.cellWidth;
    this.scrollY = Math.floor(Math.max(0, moveY) / this.settings.cellHeight) * this.settings.cellHeight;

    if (!this.canvasManager.isCanvasAvailable()) return;

    const newStartCol = this.calculation.visibleCol(this.scrollX);
    const newStartRow = this.calculation.visibleRow(this.scrollY);

    const deltaCol = this.prevStartCol >= 0 ? newStartCol - this.prevStartCol : Number.MAX_SAFE_INTEGER;
    const deltaRow = this.prevStartRow >= 0 ? newStartRow - this.prevStartRow : Number.MAX_SAFE_INTEGER;

    const canIncrementalH = Math.abs(deltaCol) > 0 && Math.abs(deltaCol) <= this.MAX_INCREMENTAL_SCROLL;
    const canIncrementalV = Math.abs(deltaRow) > 0 && Math.abs(deltaRow) <= this.MAX_INCREMENTAL_SCROLL;
    const noChangeH = deltaCol === 0;
    const noChangeV = deltaRow === 0;

    if ((canIncrementalH || noChangeH) && (canIncrementalV || noChangeV) && !(noChangeH && noChangeV)) {
      this.moveCanvas(deltaCol, deltaRow);
    } else {
      this.drawGrid();
      return;
    }

    this.prevStartCol = newStartCol;
    this.prevStartRow = newStartRow;
  }

  private moveCanvas(deltaCol: number, deltaRow: number): void {
    this.renderGrid.renderHeader();

    const renderCanvas = this.canvasManager.renderCanvas;
    const renderCanvasCtx = this.canvasManager.renderCanvasCtx;
    if (!renderCanvas || !renderCanvasCtx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = renderCanvas.width;
    tempCanvas.height = renderCanvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(renderCanvas, 0, 0);

    this.canvasManager.clearRenderCanvas();

    const shiftX = -deltaCol * this.settings.cellWidth;
    const shiftY = -deltaRow * this.settings.cellHeight;
    renderCanvasCtx.drawImage(tempCanvas, shiftX, shiftY);

    const visibleCols = this.calculation.visibleColCount(this.canvasManager.width) + 1;
    const visibleRows = this.calculation.visibleRowCount(this.canvasManager.height) + 1;
    const startCol = this.calculation.visibleCol(this.scrollX);
    const startRow = this.calculation.visibleRow(this.scrollY);

    if (deltaCol !== 0) {
      this.renderGrid.renderCellsForHorizontalScroll(deltaCol, visibleCols, visibleRows, startCol, startRow);
    }

    if (deltaRow !== 0) {
      this.renderGrid.renderCellsForVerticalScroll(deltaRow, visibleCols, visibleRows, startCol, startRow);
    }

    this.compositeToMain();
    this.drawSelectedCell();
  }

  public getScrollX(): number {
    return this.scrollX;
  }

  public getScrollY(): number {
    return this.scrollY;
  }

  public getMaxScrollX(): number {
    return this.calculation.getWidth() + this.settings.cellWidth;
  }

  public getMaxScrollY(): number {
    return this.renderGrid.totalRows * this.settings.cellHeight + this.settings.cellHeight;
  }

  public getVisibleWidth(): number {
    return this.canvasManager.width;
  }

  public getVisibleHeight(): number {
    return this.canvasManager.height - this.settings.cellHeaderHeight;
  }

  public drawSelectedCell(): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx || !this.selection.hasSelection()) return;

    const firstVisibleCol = this.calculation.visibleCol(this.scrollX);
    const firstVisibleRow = this.calculation.visibleRow(this.scrollY);

    const col = (this.selection.selectedCol() - firstVisibleCol) * this.settings.cellWidth;
    const row = (this.selection.selectedRow() - firstVisibleRow) * this.settings.cellHeight + this.settings.cellHeaderHeight;

    ctx.save();
    ctx.rect(0, this.settings.cellHeaderHeight, this.canvasManager.width, this.canvasManager.height - this.settings.cellHeaderHeight);
    ctx.clip();

    if (this.isFocused) {
      ctx.strokeStyle = this.gridColors.focusBorderColor;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = 'grey';
      ctx.setLineDash([1, 2]);
    }

    ctx.strokeRect(col - 1, row - 1, this.settings.cellWidth + 3, this.settings.cellHeight + 1);
    ctx.restore();
  }

  private compositeToMain(): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvasManager.width, this.canvasManager.height);

    if (this.canvasManager.headerCanvas) {
      const headerHeight = this.settings.cellHeaderHeight;
      const ratio = DrawHelper.pixelRatio();

      ctx.drawImage(
        this.canvasManager.headerCanvas,
        this.scrollX * ratio,
        0,
        this.canvasManager.width * ratio,
        headerHeight * ratio,
        0,
        0,
        this.canvasManager.width,
        headerHeight
      );
    }

    if (this.canvasManager.renderCanvas) {
      ctx.drawImage(
        this.canvasManager.renderCanvas,
        0,
        0,
        this.canvasManager.renderCanvas.width,
        this.canvasManager.renderCanvas.height,
        0,
        this.settings.cellHeaderHeight,
        this.canvasManager.renderCanvas.width,
        this.canvasManager.renderCanvas.height
      );
    }
  }
}
