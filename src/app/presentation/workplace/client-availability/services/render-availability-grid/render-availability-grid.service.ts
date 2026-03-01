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

@Injectable()
export class RenderAvailabilityGridService {
  private settings = inject(AvailabilitySettingService);
  private canvasManager = inject(AvailabilityCanvasManagerService);
  private calculation = inject(AvailabilityCalculationService);
  private headerRendering = inject(AvailabilityHeaderRenderingService);
  private cellRendering = inject(AvailabilityCellRenderingService);
  private checkboxDrawing = inject(CheckboxDrawingService);
  private dataManagement = inject(DataManagementClientAvailabilityService);

  private clients: { id: string; displayName: string }[] = [];

  public setClients(clients: { id: string; displayName: string }[]): void {
    this.clients = clients;
  }

  public getClients(): { id: string; displayName: string }[] {
    return this.clients;
  }

  public initialize(): void {
    this.checkboxDrawing.initialize();
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
    const bodyHeight = this.canvasManager.height - this.settings.cellHeaderHeight;
    const cellWidth = this.settings.cellWidth;
    const cellHeight = this.settings.cellHeight;

    const startCol = this.calculation.visibleCol(scrollX);
    const startRow = this.calculation.visibleRow(scrollY);
    const visibleCols = this.calculation.visibleColCount(width);
    const visibleRows = this.calculation.visibleRowCount(this.canvasManager.height);

    this.canvasManager.resizeRenderCanvas(visibleRows + 1, visibleCols + 1);

    if (!this.canvasManager.renderCanvasCtx) return;
    const ctx = this.canvasManager.renderCanvasCtx;

    for (let row = 0; row < visibleRows && (startRow + row) < this.clients.length; row++) {
      const client = this.clients[startRow + row];
      if (!client) continue;

      for (let col = 0; col < visibleCols && (startCol + col) < this.calculation.totalColumns; col++) {
        const dateHour = this.calculation.columnToDateHour(startCol + col);

        const isAvailable = this.dataManagement.isGroupAvailable(
          client.id,
          dateHour.dateString,
          dateHour.startHour,
          dateHour.endHour
        );

        const isWeekend = this.calculation.isWeekend(dateHour.date);

        this.cellRendering.renderCell(
          ctx,
          col * cellWidth,
          row * cellHeight,
          isAvailable,
          isWeekend
        );
      }
    }
  }

  public get totalRows(): number {
    return this.clients.length;
  }
}
