// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Group } from './group-class';
import { PaymentInterval } from '../contract/payment-interval.enum';
import { formatDateOnly } from 'src/app/domain/helpers/date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

describe('Group', () => {
  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('activates the configured zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it('keeps the calendar day of UTC-midnight validity strings from the backend', () => {
        const group = new Group({
          name: 'Team',
          validFrom: '2026-08-03T00:00:00Z' as unknown as Date,
          validUntil: '2026-12-31T00:00:00Z' as unknown as Date,
        });

        expect(formatDateOnly(group.validFrom)).toBe('2026-08-03');
        expect(formatDateOnly(group.validUntil as Date)).toBe('2026-12-31');
      });

      it('leaves validUntil empty when the backend sends none', () => {
        const group = new Group({ name: 'Team', validFrom: '2026-08-03T00:00:00Z' as unknown as Date });

        expect(group.validUntil).toBeUndefined();
      });

      it('keeps Date instances as they are', () => {
        const validFrom = new Date(2026, 7, 3);
        const group = new Group({ name: 'Team', validFrom });

        expect(group.validFrom).toBe(validFrom);
      });
    });
  }

  it('keeps the stored payment interval and calendar of a server group, Weekly (0) included, so a save sends them back unchanged', () => {
    const weekly = new Group({ name: 'Event', paymentInterval: PaymentInterval.Weekly, calendarSelectionId: 'cal-1' });
    const unset = new Group({ name: 'New' });

    expect(weekly.paymentInterval).toBe(PaymentInterval.Weekly);
    expect(weekly.calendarSelectionId).toBe('cal-1');
    expect(unset.paymentInterval).toBe(PaymentInterval.Monthly);
    expect(unset.calendarSelectionId).toBeUndefined();
  });
});
