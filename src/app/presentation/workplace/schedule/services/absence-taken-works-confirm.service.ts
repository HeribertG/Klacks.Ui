// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Asks the planner before an absence removes uncovered services: the backend names the works that would fall, and
 * nothing is written unless the planner agrees. An absence with a duration and no clock times counts as the whole day,
 * so this also catches a single click on a duration absence. A failed preview refuses, it never writes blind.
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { Break } from 'src/app/domain/models/break/break-class';
import { RemovableWork } from 'src/app/domain/models/dtos/removable-work.dto';
import { BreakCellParams } from 'src/app/domain/services/schedule/break-cell-params.interface';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleEntryCrudService } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { ModalService } from 'src/app/presentation/modal/modal.service';

const MAX_LISTED_WORKS = 10;
const TIME_LENGTH = 5;
const WORK_SEPARATOR = ', ';

@Injectable({ providedIn: 'root' })
export class AbsenceTakenWorksConfirmService {
  private scheduleEntryCrud = inject(ScheduleEntryCrudService);
  private dataManagement = inject(DataManagementScheduleService);
  private modalService = inject(ModalService);
  private translateService = inject(TranslateService);

  async confirm(entries: BreakCellParams[]): Promise<boolean> {
    let taken: RemovableWork[];
    try {
      taken = await this.scheduleEntryCrud.previewTakenWorks(entries);
    } catch {
      return false;
    }
    if (taken.length === 0) return true;
    return new Promise(resolve => this.ask(taken, resolve));
  }

  confirmBreak(entry: Break): Promise<boolean> {
    return this.confirm([{
      clientId: entry.clientId,
      absenceId: entry.absenceId,
      date: entry.currentDate,
      workTime: entry.workTime,
      startTime: entry.startTime,
      endTime: entry.endTime,
    }]);
  }

  private ask(taken: RemovableWork[], answer: (agreed: boolean) => void): void {
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('schedule.taken-works.title'),
      message: this.translateService.instant('schedule.taken-works.message', {
        count: taken.length,
        works: this.describe(taken),
      }),
      confirmText: this.translateService.instant('schedule.taken-works.confirm'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => answer(true),
      onDismiss: () => answer(false),
    });
  }

  private describe(taken: RemovableWork[]): string {
    const listed = taken.slice(0, MAX_LISTED_WORKS).map(work => this.describeWork(work));
    const hidden = taken.length - listed.length;
    if (hidden > 0) {
      listed.push(this.translateService.instant('schedule.taken-works.more', { count: hidden }));
    }
    return listed.join(WORK_SEPARATOR);
  }

  private describeWork(work: RemovableWork): string {
    const client = this.dataManagement.clients.find(c => c.id === work.clientId);
    const name = [client?.firstName, client?.name].filter(Boolean).join(' ');
    const date = parseCalendarDate(work.date)?.toLocaleDateString(this.translateService.currentLang) ?? work.date;
    const hours = `${work.startTime.slice(0, TIME_LENGTH)}-${work.endTime.slice(0, TIME_LENGTH)}`;
    return [name, date, hours].filter(Boolean).join(' ');
  }
}
