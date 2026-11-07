// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TranslateService } from '@ngx-translate/core';
import { errorCountToReconfirm, parseUnsealedWorksConflict, sealErrorMessage, unsealedWorksMessage } from './period-seal-conflict';

const conflict = (error: object) => ({ status: 409, error });
const translate = {
  instant: (key: string, params?: Record<string, unknown>) => `${key}|${JSON.stringify(params ?? {})}`,
} as unknown as TranslateService;

describe('period-seal-conflict', () => {
  describe('errorCountToReconfirm', () => {
    it('offers the confirmation for the unresolved-errors conflict with its count', () => {
      expect(
        errorCountToReconfirm(conflict({ errorCode: 'PERIOD_VALIDATION_CONFLICT', currentErrorCount: 3 }), false, null),
      ).toBe(3);
    });

    it('keeps the legacy confirmation for a 409 without a code and without a count', () => {
      expect(errorCountToReconfirm(conflict({}), false, null)).toBeNull();
    });

    it('never offers "seal anyway" for the conflict about unconfirmed services', () => {
      const unsealed = conflict({ errorCode: 'PERIOD_UNSEALED_WORKS', unsealedWorkCount: 2, works: [] });

      expect(errorCountToReconfirm(unsealed, false, null)).toBeUndefined();
      expect(errorCountToReconfirm(unsealed, true, 0)).toBeUndefined();
    });

    it('never offers "close anyway" for the conflict about services on stand-ins', () => {
      const standIns = conflict({ errorCode: 'PERIOD_STAND_IN_WORKS', standInWorkCount: 3 });

      expect(errorCountToReconfirm(standIns, false, null)).toBeUndefined();
      expect(errorCountToReconfirm(standIns, true, 0)).toBeUndefined();
    });

    it('ignores anything but a 409', () => {
      expect(errorCountToReconfirm({ status: 500, error: {} }, false, null)).toBeUndefined();
    });
  });

  describe('parseUnsealedWorksConflict', () => {
    const body = {
      errorCode: 'PERIOD_UNSEALED_WORKS',
      unsealedWorkCount: 4,
      works: [
        {
          workId: 'w1',
          clientId: 'c1',
          clientName: 'Elsa Muster',
          date: '2026-11-03',
          startTime: '08:00:00',
          endTime: '16:00:00',
          shiftName: 'Early',
        },
      ],
    };

    it('reads the count and the listed services', () => {
      const parsed = parseUnsealedWorksConflict(conflict(body));

      expect(parsed?.count).toBe(4);
      expect(parsed?.works).toHaveLength(1);
      expect(parsed?.works[0].clientName).toBe('Elsa Muster');
    });

    it('is null for any other conflict or status', () => {
      expect(parseUnsealedWorksConflict(conflict({ errorCode: 'PERIOD_VALIDATION_CONFLICT', currentErrorCount: 1 }))).toBeNull();
      expect(parseUnsealedWorksConflict({ status: 500, error: body })).toBeNull();
      expect(parseUnsealedWorksConflict(null)).toBeNull();
    });

    it('tolerates a body without a list', () => {
      const parsed = parseUnsealedWorksConflict(conflict({ errorCode: 'PERIOD_UNSEALED_WORKS', unsealedWorkCount: 2 }));

      expect(parsed).toEqual({ count: 2, works: [] });
    });
  });

  describe('sealErrorMessage', () => {
    it('shows the backend reason of a refusal (detail) before the transport message', () => {
      expect(sealErrorMessage({ status: 400, error: { detail: 'Start date must be before the end date.' } }, translate)).toBe(
        'Start date must be before the end date.',
      );
    });

    it('explains the stand-in refusal translated, with its count', () => {
      expect(sealErrorMessage(conflict({ errorCode: 'PERIOD_STAND_IN_WORKS', standInWorkCount: 3, detail: 'English' }), translate))
        .toBe('periodClosing.error.standInWorks|{"count":3}');
    });

    it('names the count and lists at most five services of the unconfirmed-services refusal', () => {
      const works = Array.from({ length: 7 }, (_, index) => ({
        workId: `w${index}`,
        clientId: 'c1',
        clientName: 'Elsa Muster',
        date: '2026-11-03',
        startTime: '08:00:00',
        endTime: '16:00:00',
        shiftName: 'Early',
      }));

      const message = unsealedWorksMessage({ count: 9, works }, translate);

      expect(message).toContain('periodClosing.error.unsealedWorks|');
      expect(message).toContain('"count":9');
      expect((message.match(/Elsa Muster/g) ?? []).length).toBe(5);
      expect(message).toContain('periodClosing.error.unsealedWorksMore|{\\"count\\":4}');
    });
  });
});
