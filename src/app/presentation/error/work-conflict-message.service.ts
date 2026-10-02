// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Turns the structured 409 body of a refused work booking into a readable, translated sentence. The
 * backend sends only codes and ids; names of employee, shift and qualification are resolved here from
 * the data the schedule page has already loaded, so the sentence follows the user's language.
 * @param isWorkConflict - True when the error is a 409 with one of the known work-conflict error codes
 * @param buildMessage - Translated message for such an error; null when it is not a work conflict
 * @param target.clientId - Employee the booking was meant for (from the request body)
 * @param target.shiftId - Shift the booking was meant for (from the request body)
 */

import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LocaleService } from 'src/app/application/services/locale.service';
import { WORK_CONFLICT, WORK_CONFLICT_ERROR_CODE_VALUES } from 'src/app/domain/constants/work-conflict.constants';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { IWorkConflictItem, IWorkConflictProblem } from 'src/app/domain/interfaces/work-conflict-problem.interface';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { formatCalendarDate } from 'src/app/shared/helpers/locale-date-format.helper';

export interface WorkConflictTarget {
  clientId?: string;
  shiftId?: string;
}

export function readWorkConflictProblem(error: unknown): IWorkConflictProblem | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== WORK_CONFLICT.CONFLICT_STATUS) {
    return null;
  }
  const body = error.error as Partial<IWorkConflictProblem> | null | undefined;
  const code = body?.errorCode;
  return typeof code === 'string' && WORK_CONFLICT_ERROR_CODE_VALUES.includes(code)
    ? (body as IWorkConflictProblem)
    : null;
}

@Injectable({ providedIn: 'root' })
export class WorkConflictMessageService {
  private translate = inject(TranslateService);
  private localeService = inject(LocaleService);
  private schedule = inject(DataManagementScheduleService);

  isWorkConflict(error: unknown): boolean {
    return readWorkConflictProblem(error) !== null;
  }

  buildMessage(error: unknown, target: WorkConflictTarget): string | null {
    const problem = readWorkConflictProblem(error);
    if (!problem) {
      return null;
    }

    switch (problem.errorCode) {
      case WORK_CONFLICT.ERROR_CODES.SPORADIC_DAY_FULL:
        return this.translate.instant(WORK_CONFLICT.MESSAGE_KEYS.SPORADIC_DAY_FULL, {
          shift: this.shiftName(problem, target),
          date: this.formatDate(problem.date),
          engaged: problem.engaged ?? 0,
          capacity: problem.capacity ?? 0,
        });
      case WORK_CONFLICT.ERROR_CODES.SPORADIC_RANGE_EXHAUSTED:
        return this.translate.instant(WORK_CONFLICT.MESSAGE_KEYS.SPORADIC_RANGE_EXHAUSTED, {
          shift: this.shiftName(problem, target),
          from: this.formatDate(problem.rangeFrom),
          until: this.formatDate(problem.rangeUntil),
          booked: problem.booked ?? 0,
          capacity: problem.capacity ?? 0,
        });
      default:
        return this.buildBlockedMessage(problem, target);
    }
  }

  private buildBlockedMessage(problem: IWorkConflictProblem, target: WorkConflictTarget): string {
    const conflicts = problem.conflicts ?? [];
    if (conflicts.length === 0) {
      return this.describeGeneric(problem, target, problem.date);
    }
    return conflicts
      .slice(0, WORK_CONFLICT.MAX_LINES)
      .map((conflict) => this.describeConflict(conflict, problem, target))
      .join('\n');
  }

  private describeConflict(conflict: IWorkConflictItem, problem: IWorkConflictProblem, target: WorkConflictTarget): string {
    const messageKey = this.qualificationMessageKey(conflict.code);
    const client = this.clientName(conflict.clientId || target.clientId);
    const qualification = this.qualificationName(
      problem.shiftId ?? target.shiftId,
      conflict.params?.[WORK_CONFLICT.QUALIFICATION_ID_PARAM],
    );

    if (!messageKey || !client || !qualification) {
      return this.describeGeneric(problem, target, conflict.date);
    }

    return this.translate.instant(messageKey, {
      client,
      qualification,
      shift: this.shiftName(problem, target),
      date: this.formatDate(conflict.date),
      level: conflict.params?.[WORK_CONFLICT.MIN_LEVEL_PARAM] ?? '',
    });
  }

  private describeGeneric(problem: IWorkConflictProblem, target: WorkConflictTarget, date: string | undefined): string {
    return this.translate.instant(WORK_CONFLICT.MESSAGE_KEYS.BLOCKED, {
      shift: this.shiftName(problem, target),
      date: this.formatDate(date),
    });
  }

  private qualificationMessageKey(code: string): string | null {
    switch (code) {
      case WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.MISSING:
        return WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_MISSING;
      case WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.EXPIRED:
        return WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_EXPIRED;
      case WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.INSUFFICIENT_LEVEL:
        return WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_LEVEL;
      default:
        return null;
    }
  }

  private shiftName(problem: IWorkConflictProblem, target: WorkConflictTarget): string {
    return problem.shiftName ?? this.loadedShift(problem.shiftId ?? target.shiftId)?.shiftName ?? '';
  }

  private clientName(clientId: string | undefined): string {
    const client = this.schedule.clients.find((candidate) => sameId(candidate.id, clientId));
    if (!client) {
      return '';
    }
    const personName = [client.firstName, client.name].filter((part) => !!part).join(' ').trim();
    return personName || client.company || '';
  }

  private qualificationName(shiftId: string | undefined, qualificationId: string | undefined): string {
    const qualification = this.loadedShift(shiftId)?.qualifications?.find((candidate) =>
      sameId(candidate.qualificationId, qualificationId),
    );
    return qualification ? getLocalizedValue(qualification.name, this.translate.currentLang) : '';
  }

  private loadedShift(shiftId: string | undefined) {
    return this.schedule.shiftSchedules.find((candidate) => sameId(candidate.shiftId, shiftId));
  }

  private formatDate(value: string | undefined): string {
    return formatCalendarDate(value, this.localeService.getLocale()) ?? '';
  }
}

function sameId(first: string | undefined, second: string | undefined): boolean {
  return !!first && !!second && first.toLowerCase() === second.toLowerCase();
}
