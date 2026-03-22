// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for schedule-specific grid events: delete key, double-click on Work/WorkChange, shift drag.
 * @param gridData - BaseDataService, cast to ScheduleDataService/ShiftDataService
 * @param gridSurface - GridSurfaceTemplateComponent for nameId and drawSchedule access
 * @param cellManipulation - BaseCellManipulationService for PositionCollection
 */
import { EventEmitter, inject, Injectable } from '@angular/core';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { ShiftToScheduleDragDropService } from 'src/app/presentation/workplace/schedule/services/shift-to-schedule-drag-drop.service';
import { ShiftDataService } from 'src/app/presentation/workplace/schedule/shift-section/services/shift-data.service';
import { ScheduleDataService } from 'src/app/presentation/workplace/schedule/schedule-section/services/schedule-data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { GridSurfaceTemplateComponent } from '../grid-surface-template/grid-surface-template.component';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { GridDoubleClickEvent } from './grid-template-events.directive';

@Injectable()
export class GridScheduleEventsService {
  private readonly gridData = inject(BaseDataService);
  private readonly gridSurface = inject(GridSurfaceTemplateComponent);
  private readonly cellManipulation = inject(BaseCellManipulationService);
  private readonly shiftDragService = inject(ShiftToScheduleDragDropService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);

  private readonly DRAG_DELAY_MS = 150;
  private dragDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingDragEvent: MouseEvent | null = null;

  workChangeDoubleClick = new EventEmitter<GridDoubleClickEvent>();
  workDoubleClick = new EventEmitter<GridDoubleClickEvent>();

  handleDoubleClick(pos: MyPosition): boolean {
    if (this.gridSurface.nameId !== 'surface') {
      return false;
    }

    const scheduleDataService = this.gridData as ScheduleDataService;
    const entry = scheduleDataService.getWorkScheduleEntryForCell(pos.row, pos.column);
    if (entry && (entry.lockLevel > 0 || entry.isGroupRestricted)) {
      return true;
    }

    if (this.handleWorkChangeDoubleClick(pos)) {
      return true;
    }
    if (this.handleWorkDoubleClick(pos)) {
      return true;
    }

    return false;
  }

  private handleWorkChangeDoubleClick(pos: MyPosition): boolean {
    const scheduleDataService = this.gridData as ScheduleDataService;
    const entry = scheduleDataService.getWorkScheduleEntryForCell(pos.row, pos.column);

    if (!entry || (entry.entryType !== WorkScheduleEntryType.WorkChange && entry.entryType !== WorkScheduleEntryType.Expenses)) {
      return false;
    }

    if (scheduleDataService.isColumnSealed(pos.column)) {
      return false;
    }

    if (entry.lockLevel > 0 || entry.isGroupRestricted) {
      return false;
    }

    this.workChangeDoubleClick.emit({ row: pos.row, column: pos.column });
    return true;
  }

  private handleWorkDoubleClick(pos: MyPosition): boolean {
    const scheduleDataService = this.gridData as ScheduleDataService;
    const entry = scheduleDataService.getWorkScheduleEntryForCell(pos.row, pos.column);

    if (!entry || entry.entryType !== WorkScheduleEntryType.Work) {
      return false;
    }

    if (scheduleDataService.isColumnSealed(pos.column)) {
      return false;
    }

    if (entry.lockLevel > 0 || entry.isGroupRestricted) {
      return false;
    }

    this.workDoubleClick.emit({ row: pos.row, column: pos.column });
    return true;
  }

  tryPrepareShiftDrag(event: MouseEvent): void {
    if (this.gridSurface.nameId !== 'shift') {
      return;
    }

    const pos = this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    if (!this.gridData.isCellActive(pos.row, pos.column)) {
      return;
    }

    const shiftDataService = this.gridData as ShiftDataService;
    const dragData = shiftDataService.getShiftDragData(pos.row, pos.column);
    if (!dragData) {
      return;
    }

    this.cancelPendingDrag();
    this.pendingDragEvent = event;
    this.dragDelayTimer = setTimeout(() => {
      if (this.pendingDragEvent) {
        this.shiftDragService.startDrag(this.pendingDragEvent, dragData);
        this.pendingDragEvent = null;
      }
    }, this.DRAG_DELAY_MS);
  }

  cancelPendingDrag(): void {
    if (this.dragDelayTimer) {
      clearTimeout(this.dragDelayTimer);
      this.dragDelayTimer = null;
    }
    this.pendingDragEvent = null;
  }

  isShiftDragging(): boolean {
    return this.shiftDragService.isDragging();
  }

  updateShiftDragPosition(clientY: number): void {
    this.shiftDragService.updateDragPosition(clientY);
  }

  handleDeleteKey(): void {
    if (this.gridSurface.nameId !== 'surface') {
      return;
    }

    const scheduleDataService = this.gridData as ScheduleDataService;
    const entriesToDelete: { id: string; sourceId: string; clientId: string; date: Date; entryId: string; entryType: number }[] = [];

    const positionCollection = this.cellManipulation.PositionCollection;
    const currentPos = this.gridSurface.drawSchedule.position;

    if (positionCollection.count() > 0) {
      for (let i = 0; i < positionCollection.count(); i++) {
        const pos = positionCollection.item(i);
        const deleteInfo = this.getDeleteInfoForPosition(scheduleDataService, pos.row, pos.column);
        if (deleteInfo) {
          entriesToDelete.push(deleteInfo);
        }
      }
    }

    if (currentPos && !positionCollection.contains(currentPos)) {
      const deleteInfo = this.getDeleteInfoForPosition(scheduleDataService, currentPos.row, currentPos.column);
      if (deleteInfo) {
        entriesToDelete.push(deleteInfo);
      }
    }

    if (entriesToDelete.length === 0) {
      return;
    }

    if (entriesToDelete.length === 1) {
      const entry = entriesToDelete[0];
      this.dataManagementSchedule.deleteWorkScheduleEntry(entry.id, entry.sourceId, entry.clientId, entry.date, entry.entryId, entry.entryType);
    } else {
      this.dataManagementSchedule.bulkDeleteWorkScheduleEntries(entriesToDelete);
    }
  }

  private getDeleteInfoForPosition(
    scheduleDataService: ScheduleDataService,
    row: number,
    column: number
  ): { id: string; sourceId: string; clientId: string; date: Date; entryId: string; entryType: number } | null {
    const entry = scheduleDataService.getWorkScheduleEntryForCell(row, column);
    if (!entry) {
      return null;
    }

    if (entry.lockLevel > 0 || entry.isGroupRestricted) {
      return null;
    }

    const date = scheduleDataService.getDateForColumn(column);
    if (!date) {
      return null;
    }

    return {
      id: entry.id,
      sourceId: entry.sourceId,
      clientId: entry.clientId,
      date,
      entryId: entry.entryId,
      entryType: entry.entryType,
    };
  }
}
