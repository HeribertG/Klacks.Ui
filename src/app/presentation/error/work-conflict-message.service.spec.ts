// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleService } from 'src/app/application/services/locale.service';
import { WORK_CONFLICT } from 'src/app/domain/constants/work-conflict.constants';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { formatCalendarDate } from 'src/app/shared/helpers/locale-date-format.helper';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { WorkConflictMessageService } from './work-conflict-message.service';

const CLIENT_ID = 'c0c0c0c0-0000-4000-8000-000000000001';
const SHIFT_ID = 's0s0s0s0-0000-4000-8000-000000000002';
const QUALIFICATION_ID = 'q0q0q0q0-0000-4000-8000-000000000003';
const LOCALE = 'en';
const WORK_DATE = '2027-03-10';

function conflict(body: Record<string, unknown>): HttpErrorResponse {
  return new HttpErrorResponse({ status: 409, error: { title: 'Conflict', ...body } });
}

function refusal(body: Record<string, unknown>): HttpErrorResponse {
  return new HttpErrorResponse({ status: 400, error: { title: 'Invalid request', ...body } });
}

function qualificationGap(code: string, extraParams: Record<string, string> = {}) {
  return {
    errorCode: WORK_CONFLICT.ERROR_CODES.BLOCKED,
    shiftName: 'Night watch',
    conflicts: [
      {
        code,
        clientId: CLIENT_ID,
        date: WORK_DATE,
        params: { qualificationId: QUALIFICATION_ID.toUpperCase(), minLevel: 'Proficient', ...extraParams },
      },
    ],
  };
}

describe('WorkConflictMessageService', () => {
  let service: WorkConflictMessageService;
  let instant: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    instant = vi.fn((key: string, params?: Record<string, unknown>) => `${key}|${JSON.stringify(params ?? {})}`);

    TestBed.configureTestingModule({
      providers: [
        WorkConflictMessageService,
        { provide: TranslateService, useValue: { instant, currentLang: 'de' } },
        { provide: LocaleService, useValue: { getLocale: () => LOCALE } },
        {
          provide: DataManagementScheduleService,
          useValue: {
            clients: [{ id: CLIENT_ID, firstName: 'Anna', name: 'Muster' }],
            shiftSchedules: [
              {
                shiftId: SHIFT_ID,
                shiftName: 'Loaded shift',
                qualifications: [{ qualificationId: QUALIFICATION_ID, name: { de: 'Erste Hilfe', en: 'First aid' } }],
              },
            ],
          },
        },
      ],
    });
    service = TestBed.inject(WorkConflictMessageService);
  });

  function lastParams(): Record<string, unknown> {
    return instant.mock.calls[instant.mock.calls.length - 1][1];
  }

  function lastKey(): string {
    return instant.mock.calls[instant.mock.calls.length - 1][0];
  }

  describe('isWorkConflict', () => {
    it('recognises a 409 with a known error code', () => {
      expect(service.isWorkConflict(conflict({ errorCode: WORK_CONFLICT.ERROR_CODES.BLOCKED }))).toBe(true);
    });

    it('ignores a 409 without an error code', () => {
      expect(service.isWorkConflict(conflict({}))).toBe(false);
    });

    it('ignores a 409 with an unrelated error code', () => {
      expect(service.isWorkConflict(conflict({ errorCode: 'PERIOD_VALIDATION_CONFLICT' }))).toBe(false);
    });

    it('ignores a known 409 error code on another status', () => {
      const error = new HttpErrorResponse({ status: 400, error: { errorCode: WORK_CONFLICT.ERROR_CODES.BLOCKED } });

      expect(service.isWorkConflict(error)).toBe(false);
    });

    it('recognises a 400 with a known refusal code', () => {
      expect(service.isWorkConflict(refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.DAY_SEALED }))).toBe(true);
    });

    it('ignores a 400 without a code or with an unrelated one', () => {
      expect(service.isWorkConflict(refusal({}))).toBe(false);
      expect(service.isWorkConflict(refusal({ errorCode: 'ACCOUNT_REGISTRATION_REJECTED' }))).toBe(false);
    });

    it('ignores a known refusal code on a 409', () => {
      const error = new HttpErrorResponse({ status: 409, error: { errorCode: WORK_CONFLICT.REFUSAL_CODES.DAY_SEALED } });

      expect(service.isWorkConflict(error)).toBe(false);
    });

    it('returns no message for an error that is not a work conflict', () => {
      expect(service.buildMessage(new Error('x'), {})).toBeNull();
    });
  });

  describe('missing mandatory qualification', () => {
    it('names employee, qualification in the UI language and shift instead of an id', () => {
      const message = service.buildMessage(
        conflict(qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.MISSING)),
        { clientId: CLIENT_ID, shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_MISSING);
      expect(lastParams()).toMatchObject({ client: 'Anna Muster', qualification: 'Erste Hilfe', shift: 'Night watch' });
      expect(message).not.toContain(CLIENT_ID);
    });

    it('resolves names from the shift id of the response when the request carried none (restore)', () => {
      const body = { ...qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.MISSING), shiftId: SHIFT_ID };

      service.buildMessage(conflict(body), {});

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_MISSING);
      expect(lastParams()).toMatchObject({ client: 'Anna Muster', qualification: 'Erste Hilfe' });
    });

    it('uses the expired message and the date of the booking', () => {
      service.buildMessage(
        conflict(qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.EXPIRED)),
        { clientId: CLIENT_ID, shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_EXPIRED);
      expect(lastParams()['date']).toBe(formatCalendarDate(WORK_DATE, LOCALE));
    });

    it('uses the level message with the level label when the held level is not sent', () => {
      service.buildMessage(
        conflict(qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.INSUFFICIENT_LEVEL)),
        { clientId: CLIENT_ID, shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_LEVEL);
      expect(lastParams()['level']).toBe('shift.edit-shift.qualifications.level.3|{}');
    });

    it('names the held and the required level for a binding level gap instead of a missing qualification', () => {
      service.buildMessage(
        conflict(qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.INSUFFICIENT_LEVEL, {
          heldLevel: 'Basic',
          levelDelta: '1',
        })),
        { clientId: CLIENT_ID, shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_LEVEL_HELD);
      expect(lastKey()).not.toBe(WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_MISSING);
      expect(lastParams()).toMatchObject({
        client: 'Anna Muster',
        qualification: 'Erste Hilfe',
        shift: 'Night watch',
        level: 'shift.edit-shift.qualifications.level.3|{}',
        heldLevel: 'shift.edit-shift.qualifications.level.2|{}',
        levelDelta: '1',
      });
    });

    it('keeps the missing message for a missing qualification even when level params are present', () => {
      service.buildMessage(
        conflict(qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.MISSING, { heldLevel: 'Basic' })),
        { clientId: CLIENT_ID, shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_MISSING);
    });

    it('falls back to the generic refusal when the employee is not loaded', () => {
      const body = qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.MISSING);
      body.conflicts[0].clientId = 'unknown';

      service.buildMessage(conflict(body), { clientId: 'unknown', shiftId: SHIFT_ID });

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.BLOCKED);
    });

    it('falls back to the generic refusal when the qualification is unknown', () => {
      const body = qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.MISSING, { qualificationId: 'other' });

      service.buildMessage(conflict(body), { clientId: CLIENT_ID, shiftId: SHIFT_ID });

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.BLOCKED);
    });
  });

  describe('other blocking conflicts', () => {
    it('uses the generic refusal for a conflict code it has no sentence for', () => {
      service.buildMessage(
        conflict(qualificationGap('schedule.error-list.something-new')),
        { clientId: CLIENT_ID, shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.BLOCKED);
      expect(lastParams()).toMatchObject({ shift: 'Night watch' });
    });

    it('spells out at most the configured number of conflicts, one per line', () => {
      const gap = qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.MISSING).conflicts[0];
      const body = {
        errorCode: WORK_CONFLICT.ERROR_CODES.BLOCKED,
        conflicts: Array.from({ length: WORK_CONFLICT.MAX_LINES + 2 }, () => gap),
      };

      const message = service.buildMessage(conflict(body), { clientId: CLIENT_ID, shiftId: SHIFT_ID });

      expect(message?.split('\n')).toHaveLength(WORK_CONFLICT.MAX_LINES);
    });

    it('uses the generic refusal when the body carries no conflict items', () => {
      service.buildMessage(conflict({ errorCode: WORK_CONFLICT.ERROR_CODES.BLOCKED, date: WORK_DATE }), { shiftId: SHIFT_ID });

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.BLOCKED);
      expect(lastParams()).toMatchObject({ shift: 'Loaded shift' });
    });
  });

  describe('sporadic shift refusals', () => {
    it('reports a day that is fully booked with date and occupancy', () => {
      service.buildMessage(
        conflict({
          errorCode: WORK_CONFLICT.ERROR_CODES.SPORADIC_DAY_FULL,
          shiftName: 'Standby',
          date: WORK_DATE,
          engaged: 2,
          capacity: 2,
        }),
        { shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.SPORADIC_DAY_FULL);
      expect(lastParams()).toEqual({
        shift: 'Standby',
        date: formatCalendarDate(WORK_DATE, LOCALE),
        engaged: 2,
        capacity: 2,
      });
    });

    it('reports an exhausted range with its limits', () => {
      service.buildMessage(
        conflict({
          errorCode: WORK_CONFLICT.ERROR_CODES.SPORADIC_RANGE_EXHAUSTED,
          shiftName: 'Standby',
          booked: 2,
          capacity: 2,
          rangeFrom: '2027-03-08',
          rangeUntil: '2027-03-14',
        }),
        { shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.SPORADIC_RANGE_EXHAUSTED);
      expect(lastParams()).toEqual({
        shift: 'Standby',
        from: formatCalendarDate('2027-03-08', LOCALE),
        until: formatCalendarDate('2027-03-14', LOCALE),
        booked: 2,
        capacity: 2,
      });
    });

    it('takes the shift name from the loaded shift when the body has none', () => {
      service.buildMessage(
        conflict({ errorCode: WORK_CONFLICT.ERROR_CODES.SPORADIC_DAY_FULL, date: WORK_DATE }),
        { shiftId: SHIFT_ID },
      );

      expect(lastParams()['shift']).toBe('Loaded shift');
    });
  });

  describe('refused work booking (400 refusal codes)', () => {
    const FROM = '2027-01-01';
    const UNTIL = '2027-02-28';

    function formatted(value: string): string {
      return formatCalendarDate(value, LOCALE) ?? '';
    }

    it('explains a sealed day with its formatted date', () => {
      service.buildMessage(
        refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.DAY_SEALED, code: WORK_CONFLICT.REFUSAL_CODES.DAY_SEALED, date: WORK_DATE }),
        { clientId: CLIENT_ID, shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.DAY_SEALED);
      expect(lastParams()).toEqual({ date: formatted(WORK_DATE) });
    });

    it('names the employee and a closed membership period', () => {
      service.buildMessage(
        refusal({
          errorCode: WORK_CONFLICT.REFUSAL_CODES.OUTSIDE_MEMBERSHIP_PERIOD,
          clientId: CLIENT_ID.toUpperCase(),
          date: WORK_DATE,
          from: FROM,
          until: UNTIL,
        }),
        {},
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.OUTSIDE_MEMBERSHIP_PERIOD);
      expect(lastParams()).toEqual({
        client: 'Anna Muster',
        date: formatted(WORK_DATE),
        period: `${formatted(FROM)}${WORK_CONFLICT.PERIOD_SEPARATOR}${formatted(UNTIL)}`,
      });
    });

    it('falls back to the employee of the request when the body names none', () => {
      service.buildMessage(
        refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.OUTSIDE_GROUP_PERIOD, date: WORK_DATE, from: FROM, until: UNTIL }),
        { clientId: CLIENT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.OUTSIDE_GROUP_PERIOD);
      expect(lastParams()['client']).toBe('Anna Muster');
    });

    it('describes an open end as "from"', () => {
      service.buildMessage(
        refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.OUTSIDE_GROUP_PERIOD, clientId: CLIENT_ID, date: WORK_DATE, from: FROM, until: null }),
        {},
      );

      expect(instant).toHaveBeenCalledWith(WORK_CONFLICT.PERIOD_KEYS.FROM, { from: formatted(FROM) });
    });

    it('describes an open start as "until"', () => {
      service.buildMessage(
        refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.OUTSIDE_GROUP_PERIOD, clientId: CLIENT_ID, date: WORK_DATE, until: UNTIL }),
        {},
      );

      expect(instant).toHaveBeenCalledWith(WORK_CONFLICT.PERIOD_KEYS.UNTIL, { until: formatted(UNTIL) });
    });

    it('returns null so the caller keeps its generic text when the employee is not loaded', () => {
      const message = service.buildMessage(
        refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.OUTSIDE_MEMBERSHIP_PERIOD, clientId: 'unknown', date: WORK_DATE, from: FROM }),
        {},
      );

      expect(message).toBeNull();
      expect(instant).not.toHaveBeenCalled();
    });

    it('returns null when the body carries no period bound', () => {
      const message = service.buildMessage(
        refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.OUTSIDE_MEMBERSHIP_PERIOD, clientId: CLIENT_ID, date: WORK_DATE }),
        {},
      );

      expect(message).toBeNull();
    });

    it('explains a work in a closed period without parameters', () => {
      service.buildMessage(refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.WORK_IN_CLOSED_PERIOD, lockLevel: 3 }), {});

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.WORK_IN_CLOSED_PERIOD);
    });

    it('explains a sealed work that needs a higher role', () => {
      service.buildMessage(refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.WORK_SEALED_ROLE_REQUIRED, lockLevel: 2 }), {});

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.WORK_SEALED_ROLE_REQUIRED);
    });

    it('returns no message for a 400 with an unknown code', () => {
      expect(service.buildMessage(refusal({ errorCode: 'SOMETHING_NEW' }), {})).toBeNull();
    });
  });

  describe('resolveDiagnosisSubject', () => {
    const target = { clientId: CLIENT_ID, shiftId: SHIFT_ID, date: '2027-03-10T00:00:00.000Z' };

    describe.each(CALENDAR_TEST_ZONES)('in %s', (zone) => {
      useTimeZone(zone);

      it('names person, company-local day and shift of a sealed day refused on a single booking', () => {
        const subject = service.resolveDiagnosisSubject(
          refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.DAY_SEALED, date: WORK_DATE }),
          target,
        );

        expect(subject).toEqual({
          client: 'Anna Muster',
          date: formatCalendarDate(WORK_DATE, LOCALE),
          shift: 'Loaded shift',
        });
      });

      it('takes the day of the request when the body carries none', () => {
        const subject = service.resolveDiagnosisSubject(
          refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.WORK_SEALED_ROLE_REQUIRED }),
          target,
        );

        expect(subject?.date).toBe(formatCalendarDate(WORK_DATE, LOCALE));
      });
    });

    it('prefers the shift name of the response', () => {
      const subject = service.resolveDiagnosisSubject(conflict(qualificationGap('x')), target);

      expect(subject?.shift).toBe('Night watch');
    });

    it('returns null when the person is not loaded', () => {
      expect(service.resolveDiagnosisSubject(
        refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.DAY_SEALED, date: WORK_DATE }),
        { ...target, clientId: 'unknown' },
      )).toBeNull();
    });

    it('returns null when the shift is unknown', () => {
      expect(service.resolveDiagnosisSubject(
        refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.DAY_SEALED, date: WORK_DATE }),
        { ...target, shiftId: 'unknown' },
      )).toBeNull();
    });

    it('returns null when no day is known', () => {
      expect(service.resolveDiagnosisSubject(
        refusal({ errorCode: WORK_CONFLICT.REFUSAL_CODES.WORK_IN_CLOSED_PERIOD }),
        { clientId: CLIENT_ID, shiftId: SHIFT_ID },
      )).toBeNull();
    });

    it('returns null for an error that is not a refused booking', () => {
      expect(service.resolveDiagnosisSubject(refusal({ errorCode: 'SOMETHING_NEW' }), target)).toBeNull();
    });
  });
});
