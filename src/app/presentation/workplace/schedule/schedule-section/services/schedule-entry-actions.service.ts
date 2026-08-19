// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service handling CRUD operations for schedule entries.
 * Manages adding work entries from shift menu, adding breaks from
 * absence menu, and deleting single or multiple selected entries.
 *
 * @relations
 * - Used by: ScheduleSectionComponent (via menuClicked)
 * - Uses: DataManagementScheduleService for work entry operations
 * - Uses: ScheduleEntryCrudService for break operations
 * - Uses: AbsenceMenuService for absence data
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AbsenceMenuService, AbsenceMenuItem } from 'src/app/domain/services/schedule/absence-menu.service';
import { BreakCellParams, DeleteWorkScheduleEntryParams, ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { DataScheduleService } from 'src/app/infrastructure/api/schedule/data-schedule.service';
import { DataBreakService } from 'src/app/infrastructure/api/break/data-break.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { AbsenceDetailMode } from 'src/app/domain/models/absence-detail/absence-detail-class';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { Break } from 'src/app/domain/models/break/break-class';
import { addDays, formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { DataManagementScheduleNoteService } from 'src/app/domain/services/schedule-note/data-management-schedule-note.service';
import { DataManagementScheduleCommandService } from 'src/app/domain/services/schedule-command/data-management-schedule-command.service';
import { ScheduleDataService } from './schedule-data.service';

/** Both bounds equal means no times were recorded; the duration carries the truth instead. */
const NO_TIMES_RECORDED = '00:00:00';

/** A whole day is booked as this exact pair, never as equal bounds. */
const FULL_DAY_START = '00:00:00';
const FULL_DAY_END = '23:59:00';

@Injectable()
export class ScheduleEntryActionsService {
  private translateService = inject(TranslateService);
  private dataManagement = inject(DataManagementScheduleService);
  private absenceMenuService = inject(AbsenceMenuService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  private cellManipulation = inject(BaseCellManipulationService);
  private dataScheduleService = inject(DataScheduleService);
  private dataBreakService = inject(DataBreakService);
  private scheduleNoteService = inject(DataManagementScheduleNoteService);
  private scheduleCommandService = inject(DataManagementScheduleCommandService);

  addWorkFromShiftMenu(
    shiftId: string,
    row: number,
    column: number,
    dataService: ScheduleDataService
  ): void {
    if (!shiftId) return;
    if (!dataService.startDate) return;
    if (dataService.isCellBeforeClientStart(row, column)) return;
    if (dataService.isCellOutsideGroupPeriod(row, column)) return;

    const clientIndex = dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return;

    const client = dataService.getGroupIndex(clientIndex);
    if (!client) return;

    const targetDate = addDays(dataService.startDate, column);
    const shift = this.dataManagement.shiftSchedules.find(
      (s) => s.shiftId === shiftId && this.isSameDay(new Date(s.date), targetDate)
    );

    if (!shift) return;

    this.dataManagement.addWorkScheduleEntry({
      clientId: client.id,
      date: targetDate,
      shiftId: shift.shiftId,
      workTime: shift.workTime,
      startTime: shift.startShift,
      endTime: shift.endShift,
    });
  }

  addBreakFromAbsenceMenu(
    absenceItemId: string,
    row: number,
    column: number,
    dataService: ScheduleDataService
  ): void {
    if (!absenceItemId) return;
    if (!dataService.startDate) return;
    if (dataService.isCellBeforeClientStart(row, column)) return;
    if (dataService.isCellOutsideGroupPeriod(row, column)) return;

    const clientIndex = dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return;

    const client = this.dataManagement.clients[clientIndex];
    if (!client?.id) return;

    const targetDate = addDays(dataService.startDate, column);

    const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
    const absenceItems = this.absenceMenuService.getAbsenceMenuItems(language);
    const selectedItem = absenceItems.find(item => item.id === absenceItemId);

    if (!selectedItem) return;

    const { startTime, endTime } = this.calculateBreakTimes(selectedItem);

    const periodStart = this.dataManagement.visibleStartDate
      ? formatDateOnly(this.dataManagement.visibleStartDate)
      : formatDateOnly(new Date());
    const periodEnd = this.dataManagement.visibleEndDate
      ? formatDateOnly(this.dataManagement.visibleEndDate)
      : formatDateOnly(new Date());

    const breakEntry = new Break();
    breakEntry.clientId = client.id;
    breakEntry.absenceId = selectedItem.absenceId;
    breakEntry.currentDate = targetDate;
    breakEntry.startTime = startTime;
    breakEntry.endTime = endTime;
    breakEntry.workTime = this.calculateBreakWorkTime(selectedItem);
    breakEntry.periodStart = periodStart;
    breakEntry.periodEnd = periodEnd;
    breakEntry.paymentInterval = this.dataManagement.currentFilter.paymentInterval;
    if (selectedItem.description) {
      breakEntry.description = { ...selectedItem.description };
    }

    this.scheduleEntryCrud.addBreakScheduleEntry(breakEntry);
  }

  deleteSelectedEntries(dataService: ScheduleDataService): void {
    const positionCollection = this.cellManipulation.PositionCollection;

    if (positionCollection.count() > 1) {
      const entries: DeleteWorkScheduleEntryParams[] = [];

      for (let i = 0; i < positionCollection.count(); i++) {
        const pos = positionCollection.item(i);
        const deleteInfo = this.getDeleteInfoForPosition(dataService, pos.row, pos.column);
        if (deleteInfo) {
          entries.push(deleteInfo);
        }
      }

      if (entries.length > 0) {
        this.dataManagement.bulkDeleteWorkScheduleEntries(entries);
      }
    } else {
      const pos = this.cellManipulation.Position;
      if (pos.isEmpty()) return;

      const deleteInfo = this.getDeleteInfoForPosition(dataService, pos.row, pos.column);
      if (deleteInfo) {
        this.dataManagement.deleteWorkScheduleEntry(
          deleteInfo.id,
          deleteInfo.sourceId,
          deleteInfo.clientId,
          deleteInfo.date,
          deleteInfo.entryId,
          deleteInfo.entryType
        );
      }
    }
  }

  getDeleteInfoForPosition(
    dataService: ScheduleDataService,
    row: number,
    column: number
  ): DeleteWorkScheduleEntryParams | null {
    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    if (!entry) return null;

    const clientIndex = dataService.rowGroupIndex[row];
    if (clientIndex === undefined) return null;

    const client = this.dataManagement.clients[clientIndex];
    if (!client?.id) return null;

    const date = dataService.getDateForColumn(column);
    if (!date) return null;

    return {
      id: entry.id,
      sourceId: entry.sourceId,
      clientId: client.id,
      date: date,
      entryId: entry.entryId,
      entryType: entry.entryType,
    };
  }

  private calculateBreakTimes(item: AbsenceMenuItem): { startTime: string; endTime: string } {
    if (item.isDetail && item.mode === AbsenceDetailMode.TimeRange && item.startTime && item.endTime) {
      return {
        startTime: item.startTime,
        endTime: item.endTime
      };
    }

    if (item.isDetail && item.mode === AbsenceDetailMode.Duration && item.duration) {
      return {
        startTime: NO_TIMES_RECORDED,
        endTime: NO_TIMES_RECORDED
      };
    }

    return {
      startTime: FULL_DAY_START,
      endTime: FULL_DAY_END
    };
  }

  /**
   * Hours to credit for a break created from an absence menu item.
   * A detail recorded in duration mode carries its length in `duration` and no times at all;
   * without this the duration was dropped and the entry was booked as a full day instead.
   */
  private calculateBreakWorkTime(item: AbsenceMenuItem | undefined): number {
    if (item?.isDetail && item.mode === AbsenceDetailMode.Duration && item.duration) {
      return item.duration;
    }

    return 0;
  }

  confirmWork(row: number, column: number, dataService: ScheduleDataService): void {
    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    if (!entry) return;

    if (entry.entryType === WorkScheduleEntryType.Work) {
      this.dataScheduleService.confirmWork(entry.id).subscribe({
        next: () => this.dataManagement.readDatas(false),
        error: (err) => console.error('Error confirming work:', err),
      });
    } else if (entry.entryType === WorkScheduleEntryType.Break) {
      this.dataBreakService.confirmBreak(entry.id).subscribe({
        next: () => this.dataManagement.readDatas(false),
        error: (err) => console.error('Error confirming break:', err),
      });
    }
  }

  unconfirmWork(row: number, column: number, dataService: ScheduleDataService): void {
    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    if (!entry) return;

    if (entry.entryType === WorkScheduleEntryType.Work) {
      this.dataScheduleService.unconfirmWork(entry.id).subscribe({
        next: () => this.dataManagement.readDatas(false),
        error: (err) => console.error('Error unconfirming work:', err),
      });
    } else if (entry.entryType === WorkScheduleEntryType.Break) {
      this.dataBreakService.unconfirmBreak(entry.id).subscribe({
        next: () => this.dataManagement.readDatas(false),
        error: (err) => console.error('Error unconfirming break:', err),
      });
    }
  }

  async adoptBreakPlaceholder(bp: IBreakPlaceholder, absenceItemId: string | undefined): Promise<void> {
    if (!bp.from || !bp.until || !bp.clientId) return;

    const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
    const absenceItems = this.absenceMenuService.getAbsenceMenuItems(language);

    let selectedItem: AbsenceMenuItem | undefined;
    if (absenceItemId) {
      selectedItem = absenceItems.find(item => item.id === absenceItemId);
    } else {
      selectedItem = absenceItems.find(item => item.absenceId === bp.absenceId && !item.isDetail);
    }

    const absenceId = selectedItem?.absenceId ?? bp.absenceId;
    const { startTime, endTime } = selectedItem
      ? this.calculateBreakTimes(selectedItem)
      : { startTime: FULL_DAY_START, endTime: FULL_DAY_END };
    const workTime = this.calculateBreakWorkTime(selectedItem);
    const description = selectedItem?.description ? { ...selectedItem.description } : undefined;

    const from = new Date(bp.from);
    from.setHours(0, 0, 0, 0);
    const until = new Date(bp.until);
    until.setHours(0, 0, 0, 0);

    const entries: BreakCellParams[] = [];
    const current = new Date(from);
    while (current <= until) {
      entries.push({
        clientId: bp.clientId,
        absenceId,
        date: new Date(current),
        workTime,
        startTime,
        endTime,
        description,
      });
      current.setDate(current.getDate() + 1);
    }

    await this.scheduleEntryCrud.bulkAddBreakScheduleEntries(entries);
  }

  deleteScheduleNote(row: number, column: number, dataService: ScheduleDataService): void {
    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    if (!entry || entry.entryType !== WorkScheduleEntryType.ScheduleNote) return;

    this.scheduleNoteService.delete(entry.id).subscribe({
      next: () => this.dataManagement.readDatas(false),
    });
  }

  updateScheduleNote(
    id: string,
    clientId: string,
    currentDate: string,
    content: string
  ): void {
    this.scheduleNoteService.update({ id, clientId, currentDate, content }).subscribe({
      next: () => this.dataManagement.readDatas(false),
    });
  }

  deleteScheduleCommand(row: number, column: number, dataService: ScheduleDataService): void {
    const entry = dataService.getWorkScheduleEntryForCell(row, column);
    if (!entry || entry.entryType !== WorkScheduleEntryType.ScheduleCommand) return;

    this.scheduleCommandService.delete(entry.id).subscribe({
      next: () => this.dataManagement.readDatas(false),
    });
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
