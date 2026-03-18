// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service zur Steuerung der Fill-Handle-Drag-Logik im Schedule-Grid.
 * Verwaltet Start, Update, Ende und visuelle Darstellung des Fill-Handle-Drags
 * sowie das automatische Scrollen am Rand und die Datenübernahme (Work/Break).
 * @param fillHandleService - State-Management des Fill-Handle-Drags
 * @param gridData - Abstrakte Grid-Datenquelle (wird als ScheduleDataService gecastet)
 * @param gridSettings - Grid-Darstellungseinstellungen (Zellgröße, Zoom, Header)
 * @param scrollGrid - Scroll-Position und sichtbare Zeilen/Spalten
 * @param gridFonts - Schriftart-Konfiguration für Preview-Text
 * @param dataManagementSchedule - CRUD-Operationen für Schedule-Einträge
 * @param cellManipulation - Aktuelle Zellposition und Selektion
 */
import { ElementRef, inject, Injectable } from '@angular/core';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { GridSurfaceTemplateComponent } from '../../body/grid-surface-template/grid-surface-template.component';
import { FillHandleService } from 'src/app/presentation/workplace/schedule/services/fill-handle.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleDataService } from 'src/app/presentation/workplace/schedule/schedule-section/services/schedule-data.service';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { BreakCellParams } from 'src/app/domain/services/schedule/schedule-entry-crud.service';

export interface FillHandleDragContext {
  gridSurface: GridSurfaceTemplateComponent;
  el: ElementRef<HTMLCanvasElement>;
}

@Injectable()
export class GridFillHandleDragService {
  private gridData = inject(BaseDataService);
  private gridSettings = inject(BaseSettingsService);
  private scrollGrid = inject(ScrollService);
  private cellManipulation = inject(BaseCellManipulationService);
  private fillHandleService = inject(FillHandleService);
  private gridFonts = inject(GridFontsService);
  private dataManagementSchedule = inject(DataManagementScheduleService);

  private readonly FILL_HANDLE_HIT_AREA = 12;
  private readonly AUTO_SCROLL_INITIAL_DELAY = 400;
  private readonly AUTO_SCROLL_MIN_DELAY = 50;

  private autoScrollTimer: ReturnType<typeof setInterval> | null = null;
  private autoScrollStartTime = 0;

  private context!: FillHandleDragContext;

  initialize(context: FillHandleDragContext): void {
    this.context = context;
  }

  isDragging(): boolean {
    return this.fillHandleService.isDragging();
  }

  tryStartDrag(event: MouseEvent): boolean {
    if (this.context.gridSurface.nameId !== 'surface') {
      return false;
    }

    if (!this.context.gridSurface.drawSchedule.showFillHandle) {
      return false;
    }

    const pos = this.cellManipulation.Position;

    if (pos.isEmpty() || !this.gridData.isCellDraggable(pos.row, pos.column)) {
      return false;
    }

    if (this.cellManipulation.PositionCollection.count() > 1) {
      return false;
    }

    if (!this.isOverFillHandle(event, pos)) {
      return false;
    }

    const scheduleDataService = this.gridData as ScheduleDataService;
    const entry = scheduleDataService.getWorkScheduleEntryForCell(pos.row, pos.column);

    if (!entry) {
      return false;
    }

    const date = scheduleDataService.getDateForColumn(pos.column);
    const shift = this.dataManagementSchedule.shiftSchedules.find(
      (s) => s.shiftId === entry.entryId && date && this.isSameDay(s.date, date)
    );
    const workTime = shift?.workTime ?? 0;

    this.fillHandleService.startDrag(pos, entry.entryId, workTime, entry.entryType);
    this.context.el.nativeElement.style.cursor = 'e-resize';
    return true;
  }

  updateDrag(event: MouseEvent): void {
    this.handleAutoScrollOnEdge(event);

    const pos = this.context.gridSurface.drawSchedule.calcCorrectCoordinate(event);

    if (!this.context.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    const startPos = this.fillHandleService.state.startPosition;
    if (!startPos || pos.row !== startPos.row) {
      return;
    }

    this.fillHandleService.updateDragColumn(pos.column);

    if (pos.column <= startPos.column) {
      this.context.gridSurface.drawSchedule.refresh();
    } else {
      this.drawFillHandleSelection();
    }
  }

  async endDrag(): Promise<void> {
    this.stopAutoScroll();
    const result = this.fillHandleService.endDrag();
    this.context.el.nativeElement.style.cursor = 'default';

    if (!result || result.startColumn >= result.endColumn) {
      this.context.gridSurface.drawSchedule.refresh();
      return;
    }

    const scheduleDataService = this.gridData as ScheduleDataService;

    if (result.entryType === WorkScheduleEntryType.Break) {
      await this.handleDropForBreak(scheduleDataService, result);
    } else {
      await this.handleDropForWork(scheduleDataService, result);
    }

    this.context.gridSurface.drawSchedule.refresh();
  }

  updateCursorForFillHandle(event: MouseEvent): void {
    if (this.context.gridSurface.nameId !== 'surface') {
      return;
    }

    if (!this.context.gridSurface.drawSchedule.showFillHandle) {
      return;
    }

    const pos = this.cellManipulation.Position;
    if (pos.isEmpty() || !this.gridData.isCellDraggable(pos.row, pos.column)) {
      this.context.el.nativeElement.style.cursor = 'default';
      return;
    }

    if (this.cellManipulation.PositionCollection.count() > 1) {
      this.context.el.nativeElement.style.cursor = 'default';
      return;
    }

    if (this.isOverFillHandle(event, pos)) {
      this.context.el.nativeElement.style.cursor = 'e-resize';
    } else {
      this.context.el.nativeElement.style.cursor = 'default';
    }
  }

  private drawFillHandleSelection(): void {
    const state = this.fillHandleService.state;
    if (!state.startPosition) return;

    this.context.gridSurface.drawSchedule.refresh();

    const ctx = (this.context.gridSurface.drawSchedule as any)['canvasManager'].ctx;
    if (!ctx) return;

    const firstVisibleCol = this.scrollGrid.horizontalScrollPosition;
    const firstVisibleRow = this.scrollGrid.verticalScrollPosition;
    const cellWidth = this.gridSettings.cellWidth;
    const cellHeight = this.gridSettings.cellHeight;
    const headerHeight = this.gridSettings.cellHeaderHeight;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#4a90d9';

    for (let col = state.startPosition.column + 1; col <= state.currentColumn; col++) {
      const x = (col - firstVisibleCol) * cellWidth;
      const y = (state.startPosition.row - firstVisibleRow) * cellHeight + headerHeight;
      ctx.fillRect(x, y, cellWidth, cellHeight);
    }

    ctx.restore();

    const startCell = this.gridData.getCell(state.startPosition.row, state.startPosition.column);
    const previewText = startCell?.mainText;

    if (previewText) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#000000';
      ctx.font = this.gridFonts.mainFontStringZoom;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let col = state.startPosition.column + 1; col <= state.currentColumn; col++) {
        const isActive = this.gridData.isCellActive(state.startPosition.row, col);

        if (!isActive) {
          const x = (col - firstVisibleCol) * cellWidth + cellWidth / 2;
          const y = (state.startPosition.row - firstVisibleRow) * cellHeight + headerHeight + cellHeight / 2;
          ctx.fillText(previewText, x, y);
        }
      }

      ctx.restore();
    }
  }

  private handleAutoScrollOnEdge(event: MouseEvent): void {
    const rect = this.context.el.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const canvasWidth = rect.width;
    const edgeThreshold = 30;

    const isAtRightEdge = mouseX > canvasWidth - edgeThreshold;

    if (!isAtRightEdge) {
      this.stopAutoScroll();
      return;
    }

    if (!this.autoScrollTimer) {
      this.autoScrollStartTime = Date.now();
      this.startAutoScroll();
    }
  }

  private startAutoScroll(): void {
    this.doAutoScrollStep();
  }

  private doAutoScrollStep(): void {
    const maxScrollPos = this.gridData.columns - this.scrollGrid.visibleCols;
    if (this.scrollGrid.horizontalScrollPosition >= maxScrollPos) {
      this.stopAutoScroll();
      return;
    }

    this.context.gridSurface.valueHScrollbar.emit(
      this.scrollGrid.horizontalScrollPosition + 1
    );

    const currentCol = this.fillHandleService.state.currentColumn;
    const maxCol = this.gridData.columns - 1;
    if (currentCol < maxCol) {
      this.fillHandleService.updateDragColumn(currentCol + 1);
      this.drawFillHandleSelection();
    }

    const elapsed = Date.now() - this.autoScrollStartTime;
    const acceleration = Math.min(elapsed / 2000, 1);
    const delay =
      this.AUTO_SCROLL_INITIAL_DELAY -
      acceleration * (this.AUTO_SCROLL_INITIAL_DELAY - this.AUTO_SCROLL_MIN_DELAY);

    this.autoScrollTimer = setTimeout(() => this.doAutoScrollStep(), delay);
  }

  private stopAutoScroll(): void {
    if (this.autoScrollTimer) {
      clearTimeout(this.autoScrollTimer);
      this.autoScrollTimer = null;
    }
    this.autoScrollStartTime = 0;
  }

  private async handleDropForBreak(
    scheduleDataService: ScheduleDataService,
    result: { startColumn: number; endColumn: number; row: number; entryId: string; workTime: number; entryType: number }
  ): Promise<void> {
    const sourceEntry = scheduleDataService.getWorkScheduleEntryForCell(result.row, result.startColumn);
    if (!sourceEntry) {
      return;
    }

    const breakEntriesToAdd: BreakCellParams[] = [];

    for (let col = result.startColumn + 1; col <= result.endColumn; col++) {
      if (scheduleDataService.isColumnSealed(col)) {
        continue;
      }

      if (scheduleDataService.isCellActive(result.row, col)) {
        continue;
      }

      const date = scheduleDataService.getDateForColumn(col);
      if (!date) {
        continue;
      }

      const clientIndex = scheduleDataService.rowGroupIndex[result.row];
      if (clientIndex === undefined) {
        continue;
      }

      const client = this.dataManagementSchedule.clients[clientIndex];
      if (!client?.id) {
        continue;
      }

      breakEntriesToAdd.push({
        clientId: client.id,
        absenceId: result.entryId,
        date: date,
        workTime: 0,
        startTime: sourceEntry.startTime ?? '00:00',
        endTime: sourceEntry.endTime ?? '00:00',
        description: sourceEntry.description ?? undefined,
      });
    }

    if (breakEntriesToAdd.length > 0) {
      await this.dataManagementSchedule.bulkAddBreakScheduleEntries(breakEntriesToAdd);
    }
  }

  private async handleDropForWork(
    scheduleDataService: ScheduleDataService,
    result: { startColumn: number; endColumn: number; row: number; entryId: string; workTime: number; entryType: number }
  ): Promise<void> {
    const sourceEntry = scheduleDataService.getWorkScheduleEntryForCell(result.row, result.startColumn);

    const entriesToAdd: {
      clientId: string;
      date: Date;
      shiftId: string;
      workTime: number;
      startTime: string;
      endTime: string;
      information?: string;
    }[] = [];

    for (let col = result.startColumn + 1; col <= result.endColumn; col++) {
      const date = scheduleDataService.getDateForColumn(col);

      if (scheduleDataService.isColumnSealed(col)) {
        continue;
      }

      if (scheduleDataService.isCellActive(result.row, col)) {
        continue;
      }

      if (!date) {
        continue;
      }

      const shiftAvailable = this.dataManagementSchedule.shiftSchedules.find(
        (s) => s.shiftId === result.entryId && this.isSameDay(s.date, date)
      );

      if (!shiftAvailable) {
        continue;
      }

      const maxCapacity = shiftAvailable.sumEmployees * shiftAvailable.quantity;
      if (shiftAvailable.engaged >= maxCapacity) {
        continue;
      }

      const clientIndex = scheduleDataService.rowGroupIndex[result.row];
      if (clientIndex === undefined) {
        continue;
      }

      const client = this.dataManagementSchedule.clients[clientIndex];
      if (!client?.id) {
        continue;
      }

      entriesToAdd.push({
        clientId: client.id,
        date: date,
        shiftId: result.entryId,
        workTime: result.workTime,
        startTime: sourceEntry?.startTime || shiftAvailable.startShift,
        endTime: sourceEntry?.endTime || shiftAvailable.endShift,
        information: sourceEntry?.information ?? undefined,
      });
    }

    if (entriesToAdd.length > 0) {
      await this.dataManagementSchedule.bulkAddWorkScheduleEntries(entriesToAdd);
    }
  }

  private isOverFillHandle(event: MouseEvent, selectedPos: MyPosition): boolean {
    const rect = this.context.el.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const firstVisibleCol = this.scrollGrid.horizontalScrollPosition;
    const firstVisibleRow = this.scrollGrid.verticalScrollPosition;
    const cellWidth = this.gridSettings.cellWidth;
    const cellHeight = this.gridSettings.cellHeight;
    const headerHeight = this.gridSettings.cellHeaderHeight;

    const cellX = (selectedPos.column - firstVisibleCol) * cellWidth;
    const cellY = (selectedPos.row - firstVisibleRow) * cellHeight + headerHeight;

    const handleCenterX = cellX + cellWidth;
    const handleCenterY = cellY + cellHeight;

    const dx = mouseX - handleCenterX;
    const dy = mouseY - handleCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const hitArea = this.FILL_HANDLE_HIT_AREA * this.gridSettings.zoom;

    return distance <= hitArea;
  }

  private isSameDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }
}
