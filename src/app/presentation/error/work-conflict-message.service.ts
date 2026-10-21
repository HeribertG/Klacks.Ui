// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Turns the structured body of a refused work booking (409 conflict or 400 refusal) into a readable, translated
 * sentence. The backend sends only codes and ids; names of employee, shift and qualification are resolved here from
 * the data the schedule page has already loaded, so the sentence follows the user's language.
 * @param isWorkConflict - True when the error is a 409 or 400 with one of the known error codes of that status
 * @param buildMessage - Translated message for such an error; null when it is not a work conflict or when the
 *   data needed for the sentence is missing (the caller then keeps its generic text)
 * @param resolveDiagnosisSubject - Person name, employee number (when the person has one), company-local date and
 *   shift name of the refused cell, for the "Why? Ask Klacksy" question; null when person name, date or shift is
 *   unknown - a client without a person name (company only) gets no question
 * @param target.clientId - Employee the booking was meant for (from the request body)
 * @param target.shiftId - Shift the booking was meant for (from the request body)
 * @param target.date - Calendar day of the booking (wire value of the request body), used when the body lacks it
 */

import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LocaleService } from 'src/app/application/services/locale.service';
import {
  WORK_CONFLICT,
  WORK_CONFLICT_ERROR_CODE_VALUES,
  WORK_REFUSAL_ERROR_CODE_VALUES,
} from 'src/app/domain/constants/work-conflict.constants';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { QUALIFICATION_LEVEL_VALIDATION } from 'src/app/domain/constants/qualification-level-validation.constants';
import {
  hasHeldQualificationLevel,
  qualificationLevelLabel,
} from 'src/app/domain/helpers/qualification-level-label.helper';
import { IWorkConflictProblem } from 'src/app/domain/interfaces/work-conflict-problem.interface';
import { IWorkConflictItem } from 'src/app/domain/interfaces/work-conflict-item.interface';
import { IWorkRefusalDiagnosisSubject } from 'src/app/domain/interfaces/work-refusal-diagnosis-subject.interface';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { IClientWork } from 'src/app/domain/models/schedule/client-work.interface';
import { WorkConflictTarget } from './work-conflict-target.interface';
import { formatCalendarDate } from 'src/app/domain/helpers/locale-date-format.helper';

const NO_EMPLOYEE_NUMBER = 0;

export function readWorkConflictProblem(error: unknown): IWorkConflictProblem | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const knownCodes = knownCodesOfStatus(error.status);
  const body = error.error as Partial<IWorkConflictProblem> | null | undefined;
  const code = body?.errorCode;
  return typeof code === 'string' && knownCodes.includes(code) ? (body as IWorkConflictProblem) : null;
}

function knownCodesOfStatus(status: number): readonly string[] {
  switch (status) {
    case WORK_CONFLICT.CONFLICT_STATUS:
      return WORK_CONFLICT_ERROR_CODE_VALUES;
    case WORK_CONFLICT.REFUSED_STATUS:
      return WORK_REFUSAL_ERROR_CODE_VALUES;
    default:
      return [];
  }
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
      case WORK_CONFLICT.REFUSAL_CODES.DAY_SEALED:
        return this.translate.instant(WORK_CONFLICT.MESSAGE_KEYS.DAY_SEALED, {
          date: this.formatDate(problem.date),
        });
      case WORK_CONFLICT.REFUSAL_CODES.OUTSIDE_MEMBERSHIP_PERIOD:
        return this.buildOutsidePeriodMessage(problem, target, WORK_CONFLICT.MESSAGE_KEYS.OUTSIDE_MEMBERSHIP_PERIOD);
      case WORK_CONFLICT.REFUSAL_CODES.OUTSIDE_GROUP_PERIOD:
        return this.buildOutsidePeriodMessage(problem, target, WORK_CONFLICT.MESSAGE_KEYS.OUTSIDE_GROUP_PERIOD);
      case WORK_CONFLICT.REFUSAL_CODES.WORK_IN_CLOSED_PERIOD:
        return this.translate.instant(WORK_CONFLICT.MESSAGE_KEYS.WORK_IN_CLOSED_PERIOD);
      case WORK_CONFLICT.REFUSAL_CODES.WORK_SEALED_ROLE_REQUIRED:
        return this.translate.instant(WORK_CONFLICT.MESSAGE_KEYS.WORK_SEALED_ROLE_REQUIRED);
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

  resolveDiagnosisSubject(error: unknown, target: WorkConflictTarget): IWorkRefusalDiagnosisSubject | null {
    const problem = readWorkConflictProblem(error);
    if (!problem) {
      return null;
    }

    const person = this.loadedClient(problem.clientId ?? target.clientId);
    const client = person ? personNameOf(person) : '';
    const shift = this.shiftName(problem, target);
    const date = this.formatDate(problem.date ?? target.date);
    if (!client || !shift || !date) {
      return null;
    }

    const clientNumber = person?.idNumber ?? NO_EMPLOYEE_NUMBER;
    return Number.isInteger(clientNumber) && clientNumber > NO_EMPLOYEE_NUMBER
      ? { client, clientNumber, date, shift }
      : { client, date, shift };
  }

  private buildOutsidePeriodMessage(
    problem: IWorkConflictProblem,
    target: WorkConflictTarget,
    messageKey: string,
  ): string | null {
    const client = this.clientName(problem.clientId ?? target.clientId);
    if (!client) {
      return null;
    }
    const period = this.describePeriod(problem.from, problem.until);
    if (!period) {
      return null;
    }
    return this.translate.instant(messageKey, { client, date: this.formatDate(problem.date), period });
  }

  private describePeriod(from: string | null | undefined, until: string | null | undefined): string {
    const first = from ? this.formatDate(from) : '';
    const last = until ? this.formatDate(until) : '';
    if (first && last) {
      return `${first}${WORK_CONFLICT.PERIOD_SEPARATOR}${last}`;
    }
    if (first) {
      return this.translate.instant(WORK_CONFLICT.PERIOD_KEYS.FROM, { from: first });
    }
    return last ? this.translate.instant(WORK_CONFLICT.PERIOD_KEYS.UNTIL, { until: last }) : '';
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
    const messageKey = this.qualificationMessageKey(conflict.code, conflict.params);
    const client = this.clientName(conflict.clientId || target.clientId);
    const qualification = this.qualificationName(
      problem.shiftId ?? target.shiftId,
      conflict.params?.[WORK_CONFLICT.QUALIFICATION_ID_PARAM],
    );

    if (!messageKey || !client || !qualification) {
      return this.describeGeneric(problem, target, conflict.date);
    }

    const translateKey = (key: string): string => this.translate.instant(key);
    return this.translate.instant(messageKey, {
      client,
      qualification,
      shift: this.shiftName(problem, target),
      date: this.formatDate(conflict.date),
      level: qualificationLevelLabel(conflict.params?.[WORK_CONFLICT.MIN_LEVEL_PARAM], translateKey),
      heldLevel: qualificationLevelLabel(
        conflict.params?.[QUALIFICATION_LEVEL_VALIDATION.HELD_LEVEL_PARAM],
        translateKey,
      ),
      levelDelta: conflict.params?.[QUALIFICATION_LEVEL_VALIDATION.LEVEL_DELTA_PARAM] ?? '',
    });
  }

  private describeGeneric(problem: IWorkConflictProblem, target: WorkConflictTarget, date: string | undefined): string {
    return this.translate.instant(WORK_CONFLICT.MESSAGE_KEYS.BLOCKED, {
      shift: this.shiftName(problem, target),
      date: this.formatDate(date),
    });
  }

  private qualificationMessageKey(code: string, params: Record<string, string> | undefined): string | null {
    switch (code) {
      case WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.MISSING:
        return WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_MISSING;
      case WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.EXPIRED:
        return WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_EXPIRED;
      case WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.INSUFFICIENT_LEVEL:
        return hasHeldQualificationLevel(params)
          ? WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_LEVEL_HELD
          : WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_LEVEL;
      default:
        return null;
    }
  }

  private shiftName(problem: IWorkConflictProblem, target: WorkConflictTarget): string {
    return problem.shiftName ?? this.loadedShift(problem.shiftId ?? target.shiftId)?.shiftName ?? '';
  }

  private clientName(clientId: string | undefined): string {
    const client = this.loadedClient(clientId);
    if (!client) {
      return '';
    }
    return personNameOf(client) || client.company || '';
  }

  private loadedClient(clientId: string | undefined): IClientWork | undefined {
    return this.schedule.clients.find((candidate) => sameId(candidate.id, clientId));
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

function personNameOf(client: IClientWork): string {
  return [client.firstName, client.name].filter((part) => !!part).join(' ').trim();
}

function sameId(first: string | undefined, second: string | undefined): boolean {
  return !!first && !!second && first.toLowerCase() === second.toLowerCase();
}
