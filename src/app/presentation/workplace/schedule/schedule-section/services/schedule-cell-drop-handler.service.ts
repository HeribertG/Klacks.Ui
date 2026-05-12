// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Executes the action chosen by ScheduleCellDragDropService when a drag ends:
 * delete (drop outside the table) or move (drop on another client row).
 * Move is implemented as add-on-target + delete-source on the frontend.
 * @param dataManagement - DataManagementScheduleService used for add/delete calls
 * @param scheduleEntryCrud - ScheduleEntryCrudService used for Break add
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { Break } from 'src/app/domain/models/break/break-class';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { IMultiLanguage, MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  ScheduleCellDragSource,
  ScheduleCellDropResult,
} from './schedule-cell-drag-drop.service';

@Injectable()
export class ScheduleCellDropHandlerService {
  private dataManagement = inject(DataManagementScheduleService);
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  private translateService = inject(TranslateService);
  private toastShowService = inject(ToastShowService);

  handleDrop(result: ScheduleCellDropResult): void {
    switch (result.action) {
      case 'delete':
        this.deleteEntry(result.source);
        return;
      case 'move':
        if (!result.targetClientId) return;
        this.moveEntry(result.source, result.targetClientId);
        return;
      case 'cancel':
      default:
        return;
    }
  }

  private deleteEntry(src: ScheduleCellDragSource): void {
    this.dataManagement.deleteWorkScheduleEntry(
      src.id,
      src.sourceId,
      src.clientId,
      src.date,
      src.entryId,
      src.entryType,
    );
  }

  private moveEntry(src: ScheduleCellDragSource, targetClientId: string): void {
    if (src.entryType === WorkScheduleEntryType.Work) {
      this.moveWork(src, targetClientId);
      return;
    }
    if (src.entryType === WorkScheduleEntryType.Break) {
      this.moveBreak(src, targetClientId);
      return;
    }
  }

  private moveWork(src: ScheduleCellDragSource, targetClientId: string): void {
    const shift = this.dataManagement.shiftSchedules.find(
      (s) => s.shiftId === src.entryId && this.isSameDay(new Date(s.date), src.date),
    );
    if (!shift) {
      this.toastShowService.showError(this.translateService.instant('schedule.moveWork.shiftNotFound'));
      return;
    }

    this.dataManagement
      .addWorkScheduleEntry({
        clientId: targetClientId,
        date: src.date,
        shiftId: shift.shiftId,
        workTime: shift.workTime,
        startTime: shift.startShift,
        endTime: shift.endShift,
      })
      .then(() => this.deleteEntry(src))
      .catch(() => this.toastShowService.showError(this.translateService.instant('schedule.moveWork.moveFailed')));
  }

  private moveBreak(src: ScheduleCellDragSource, targetClientId: string): void {
    const breakEntry = new Break();
    breakEntry.clientId = targetClientId;
    breakEntry.absenceId = src.entryId;
    breakEntry.currentDate = src.date;
    breakEntry.startTime = src.startTime;
    breakEntry.endTime = src.endTime;

    const periodStart = this.dataManagement.visibleStartDate
      ? formatDateOnly(this.dataManagement.visibleStartDate)
      : formatDateOnly(new Date());
    const periodEnd = this.dataManagement.visibleEndDate
      ? formatDateOnly(this.dataManagement.visibleEndDate)
      : formatDateOnly(new Date());
    breakEntry.periodStart = periodStart;
    breakEntry.periodEnd = periodEnd;
    breakEntry.paymentInterval = this.dataManagement.currentFilter.paymentInterval;
    breakEntry.description = this.buildBreakDescription(src.abbreviation);

    this.scheduleEntryCrud
      .addBreakScheduleEntry(breakEntry)
      .then(() => this.deleteEntry(src))
      .catch(() => this.toastShowService.showError(this.translateService.instant('schedule.moveBreak.moveFailed')));
  }

  private buildBreakDescription(abbreviation: string): MultiLanguage | undefined {
    if (!abbreviation) return undefined;
    const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
    const description: IMultiLanguage = {};
    description[language as keyof IMultiLanguage] = abbreviation;
    return description as MultiLanguage;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
