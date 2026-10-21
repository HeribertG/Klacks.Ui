// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Executes the action chosen by ScheduleCellDragDropService when a drag ends:
 * delete (drop outside the table) or move (drop on another client row).
 * Work moves reassign the existing entity in place (preserves WorkChange/Expenses
 * children); Break moves are implemented as add-on-target + delete-source. A failed move shows its
 * own toast only for a failure that is no HTTP error: an HttpErrorResponse already got its toast
 * from ResponseInterceptor (refusal text, generic Works/Breaks text, or the outage overlay).
 * @param dataManagement - DataManagementScheduleService used for add/delete/reassign calls
 * @param scheduleEntryCrud - ScheduleEntryCrudService used for Break add
 */
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { Break } from 'src/app/domain/models/break/break-class';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language.interface';
import { toLanguageKey } from 'src/app/domain/helpers/multi-language.helper';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ScheduleCellDragSource } from './schedule-cell-drag-source.interface';
import { ScheduleCellDropResult } from './schedule-cell-drop-result.interface';

const MOVE_WORK_FAILED_KEY = 'schedule.moveWork.moveFailed';
const MOVE_BREAK_FAILED_KEY = 'schedule.moveBreak.moveFailed';

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
    this.dataManagement
      .reassignWorkScheduleEntry(src.sourceId, src.clientId, targetClientId, src.date)
      .catch((error: unknown) => this.showMoveFailed(error, MOVE_WORK_FAILED_KEY));
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
      : formatDateOnly(companyToday());
    const periodEnd = this.dataManagement.visibleEndDate
      ? formatDateOnly(this.dataManagement.visibleEndDate)
      : formatDateOnly(companyToday());
    breakEntry.periodStart = periodStart;
    breakEntry.periodEnd = periodEnd;
    breakEntry.paymentInterval = this.dataManagement.currentFilter.paymentInterval;
    breakEntry.description = this.buildBreakDescription(src.abbreviation);

    this.scheduleEntryCrud
      .addBreakScheduleEntry(breakEntry)
      .then(() => this.deleteEntry(src))
      .catch((error: unknown) => this.showMoveFailed(error, MOVE_BREAK_FAILED_KEY));
  }

  private showMoveFailed(error: unknown, messageKey: string): void {
    if (error instanceof HttpErrorResponse) {
      return;
    }
    this.toastShowService.showError(this.translateService.instant(messageKey));
  }

  private buildBreakDescription(abbreviation: string): MultiLanguage | undefined {
    if (!abbreviation) return undefined;
    const language = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
    const description: IMultiLanguage = {};
    description[toLanguageKey(language)] = abbreviation;
    return description as MultiLanguage;
  }
}
