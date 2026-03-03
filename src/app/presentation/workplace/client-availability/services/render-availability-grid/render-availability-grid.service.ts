// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { AvailabilitySettingService } from '../availability-setting.service';
import { AvailabilityCanvasManagerService } from '../availability-canvas-manager.service';
import { AvailabilityCalculationService } from './availability-calculation.service';
import { AvailabilityHeaderRenderingService } from './availability-header-rendering.service';
import { AvailabilityCellRenderingService } from './availability-cell-rendering.service';
import { CheckboxDrawingService } from './checkbox-drawing.service';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { HOUR_GROUPING_SIZES } from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

const OVERLAP = 1;
const DAY_BORDER_WIDTH = 2;

@Injectable()
export class RenderAvailabilityGridService {
  private settings = inject(AvailabilitySettingService);
  private canvasManager = inject(AvailabilityCanvasManagerService);
  private calculation = inject(AvailabilityCalculationService);
  private headerRendering = inject(AvailabilityHeaderRenderingService);
  private cellRendering = inject(AvailabilityCellRenderingService);
  private checkboxDrawing = inject(CheckboxDrawingService);
  private dataManagement = inject(DataManagementClientAvailabilityService);
  private gridColors = inject(GridColorService);

  private clients: { id: string; displayName: string }[] = [];

  public setClients(clients: { id: string; displayName: string }[]): void {
    this.clients = clients;
  }

  public getClients(): { id: string; displayName: string }[] {
    return this.clients;
  }

  public initialize(): void {
    this.checkboxDrawing.initialize();
    this.cellRendering.initialize();
  }

  public renderHeader(): void {
    const headerCtx = this.canvasManager.headerCtx;
    if (!headerCtx) return;

    const width = this.calculation.getWidth();
    this.canvasManager.resizeHeaderCanvas(width);

    if (!this.canvasManager.headerCtx) return;
    this.headerRendering.renderHeader(this.canvasManager.headerCtx, width);
  }

  public renderGrid(scrollX: number, scrollY: number): void {
    const renderCtx = this.canvasManager.renderCanvasCtx;
    if (!renderCtx || !this.canvasManager.renderCanvas) return;

    const width = this.canvasManager.width;

    const startCol = this.calculation.visibleCol(scrollX);
    const startRow = this.calculation.visibleRow(scrollY);
    const visibleCols = this.calculation.visibleColCount(width);
    const visibleRows = this.calculation.visibleRowCount(this.canvasManager.height);

    this.canvasManager.resizeRenderCanvas(visibleRows + 1, visibleCols + 1);

    if (!this.canvasManager.renderCanvasCtx) return;

    this.renderCellRange(this.canvasManager.renderCanvasCtx, 0, visibleCols, 0, visibleRows, startCol, startRow);
    this.renderDayBorders(this.canvasManager.renderCanvasCtx, 0, visibleCols, 0, visibleRows, startCol, startRow);
  }

  public renderCellsForHorizontalScroll(
    deltaCol: number,
    visibleCols: number,
    visibleRows: number,
    startCol: number,
    startRow: number
  ): void {
    const ctx = this.canvasManager.renderCanvasCtx;
    if (!ctx) return;

    let colStart: number;
    let colEnd: number;

    if (deltaCol > 0) {
      colStart = Math.max(0, visibleCols - deltaCol - OVERLAP);
      colEnd = visibleCols;
    } else {
      colStart = 0;
      colEnd = Math.abs(deltaCol) + OVERLAP;
    }

    this.renderCellRange(ctx, colStart, colEnd, 0, visibleRows, startCol, startRow);
    this.renderDayBorders(ctx, colStart, colEnd, 0, visibleRows, startCol, startRow);
  }

  public renderCellsForVerticalScroll(
    deltaRow: number,
    visibleCols: number,
    visibleRows: number,
    startCol: number,
    startRow: number
  ): void {
    const ctx = this.canvasManager.renderCanvasCtx;
    if (!ctx) return;

    let rowStart: number;
    let rowEnd: number;

    if (deltaRow > 0) {
      rowStart = Math.max(0, visibleRows - deltaRow - OVERLAP);
      rowEnd = visibleRows;
    } else {
      rowStart = 0;
      rowEnd = Math.abs(deltaRow) + OVERLAP;
    }

    this.renderCellRange(ctx, 0, visibleCols, rowStart, rowEnd, startCol, startRow);
    this.renderDayBorders(ctx, 0, visibleCols, rowStart, rowEnd, startCol, startRow);
  }

  private renderCellRange(
    ctx: CanvasRenderingContext2D,
    colFrom: number,
    colTo: number,
    rowFrom: number,
    rowTo: number,
    startCol: number,
    startRow: number
  ): void {
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;
    const columnsPerDay = this.settings.columnsPerDay;

    for (let row = rowFrom; row < rowTo && (startRow + row) < this.clients.length; row++) {
      const client = this.clients[startRow + row];
      if (!client) continue;

      for (let col = colFrom; col < colTo && (startCol + col) < this.calculation.totalColumns; col++) {
        const dateHour = this.calculation.columnToDateHour(startCol + col);

        const isAvailable = this.dataManagement.isGroupAvailable(
          client.id,
          dateHour.dateString,
          dateHour.startHour,
          dateHour.endHour
        );

        const isWeekend = this.calculation.isWeekend(dateHour.date);
        const isSunday = this.calculation.isSunday(dateHour.date);
        const isHoliday = this.calculation.isHoliday(dateHour.date);
        const isOfficialHoliday = isHoliday && this.calculation.isOfficialHoliday(dateHour.date);
        const isOddSlot = (startCol + col) % columnsPerDay % 2 !== 0;

        this.cellRendering.renderCell(
          ctx,
          col * cellWidth,
          row * cellHeight,
          isAvailable,
          isOddSlot,
          isWeekend,
          isSunday,
          isHoliday,
          isOfficialHoliday
        );
      }
    }
  }

  public get totalRows(): number {
    return this.clients.length;
  }

  private renderDayBorders(
    ctx: CanvasRenderingContext2D,
    colFrom: number,
    colTo: number,
    rowFrom: number,
    rowTo: number,
    startCol: number,
    startRow: number
  ): void {
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;
    const columnsPerDay = this.settings.columnsPerDay;

    ctx.strokeStyle = this.gridColors.borderColor;
    ctx.lineWidth = DAY_BORDER_WIDTH;

    for (let col = colFrom; col < colTo && (startCol + col) < this.calculation.totalColumns; col++) {
      const absoluteCol = startCol + col;
      // Draw thick border at the start of each day (except the first column)
      if (absoluteCol > 0 && absoluteCol % columnsPerDay === 0) {
        const x = col * cellWidth;
        const rowCount = Math.min(rowTo, this.clients.length - startRow);
        
        ctx.beginPath();
        ctx.moveTo(x, rowFrom * cellHeight);
        ctx.lineTo(x, rowCount * cellHeight);
        ctx.stroke();
      }
    }
  }
}
