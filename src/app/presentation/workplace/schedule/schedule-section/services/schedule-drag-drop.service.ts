/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service handling drag-drop and cell value change operations within
 * the schedule grid. Calculates drop targets, validates positions,
 * and processes shift assignments via keyboard input.
 *
 * @relations
 * - Used by: ScheduleSectionComponent
 * - Uses: DataManagementScheduleService for adding work entries
 * - Receives: ShiftDropResult from ShiftToScheduleDragDropService
 */
import { inject, Injectable } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShiftDropResult } from '../../services/shift-to-schedule-drag-drop.service';
import { CellValueChangeEvent } from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { ScheduleDataService } from './schedule-data.service';

export interface DropTargetInfo {
  row: number;
  clientId: string;
  date: Date;
  isEmpty: boolean;
}

@Injectable()
export class ScheduleDragDropService {
  private dataManagement = inject(DataManagementScheduleService);
  private scrollService = inject(ScrollService);
  private settings = inject(BaseSettingsService);

  getDropTargetInfo(
    mouseY: number,
    column: number,
    dataService: ScheduleDataService
  ): DropTargetInfo | null {
    const scheduleElement = document.querySelector('app-schedule-section .box');
    if (!scheduleElement) {
      return null;
    }

    const rect = scheduleElement.getBoundingClientRect();
    const relativeY = mouseY - rect.top - this.settings.cellHeaderHeight;

    if (relativeY < 0) {
      return null;
    }

    const row =
      Math.floor(relativeY / this.settings.cellHeight) +
      this.scrollService.verticalScrollPosition;

    if (row < 0 || row >= dataService.rows) {
      return null;
    }

    const clientIndex = dataService.rowGroupIndex[row];
    if (clientIndex === undefined) {
      return null;
    }

    const client = this.dataManagement.clients[clientIndex];
    if (!client || !client.id) {
      return null;
    }

    const date = dataService.getDateForColumn(column);
    if (!date) {
      return null;
    }

    const isEmpty = !dataService.isCellActive(row, column);

    return {
      row,
      clientId: client.id,
      date,
      isEmpty,
    };
  }

  handleShiftDrop(result: ShiftDropResult): void {
    this.dataManagement.addWorkScheduleEntry({
      clientId: result.targetClientId,
      date: result.targetDate,
      shiftId: result.shiftId,
      workTime: result.workTime,
      startTime: result.startShift,
      endTime: result.endShift,
    });
  }

  handleCellValueChange(event: CellValueChangeEvent, dataService: ScheduleDataService): void {
    const clientIndex = dataService.rowGroupIndex[event.row];
    if (clientIndex === undefined) {
      return;
    }

    const client = this.dataManagement.clients[clientIndex];
    if (!client?.id) {
      return;
    }

    const date = dataService.getDateForColumn(event.column);
    if (!date) {
      return;
    }

    const abbreviation = event.value.trim().toUpperCase();
    if (!abbreviation) {
      return;
    }

    const matchingShift = this.dataManagement.shiftSchedules.find(
      (shift) =>
        shift.abbreviation.toUpperCase() === abbreviation &&
        this.isSameDay(shift.date, date)
    );

    if (matchingShift) {
      this.dataManagement.addWorkScheduleEntry({
        clientId: client.id,
        date: date,
        shiftId: matchingShift.shiftId,
        workTime: matchingShift.workTime,
        startTime: matchingShift.startShift,
        endTime: matchingShift.endShift,
      });
    }
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
