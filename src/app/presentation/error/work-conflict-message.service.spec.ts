// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleService } from 'src/app/application/services/locale.service';
import { WORK_CONFLICT } from 'src/app/domain/constants/work-conflict.constants';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { formatCalendarDate } from 'src/app/shared/helpers/locale-date-format.helper';
import { WorkConflictMessageService } from './work-conflict-message.service';

const CLIENT_ID = 'c0c0c0c0-0000-4000-8000-000000000001';
const SHIFT_ID = 's0s0s0s0-0000-4000-8000-000000000002';
const QUALIFICATION_ID = 'q0q0q0q0-0000-4000-8000-000000000003';
const LOCALE = 'en';
const WORK_DATE = '2027-03-10';

function conflict(body: Record<string, unknown>): HttpErrorResponse {
  return new HttpErrorResponse({ status: 409, error: { title: 'Conflict', ...body } });
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
        params: { qualificationId: QUALIFICATION_ID.toUpperCase(), minLevel: '2', ...extraParams },
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

    it('ignores a known error code on another status', () => {
      const error = new HttpErrorResponse({ status: 400, error: { errorCode: WORK_CONFLICT.ERROR_CODES.BLOCKED } });

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

    it('uses the level message and passes the required level', () => {
      service.buildMessage(
        conflict(qualificationGap(WORK_CONFLICT.QUALIFICATION_VALIDATION_KEYS.INSUFFICIENT_LEVEL)),
        { clientId: CLIENT_ID, shiftId: SHIFT_ID },
      );

      expect(lastKey()).toBe(WORK_CONFLICT.MESSAGE_KEYS.QUALIFICATION_LEVEL);
      expect(lastParams()['level']).toBe('2');
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
});
