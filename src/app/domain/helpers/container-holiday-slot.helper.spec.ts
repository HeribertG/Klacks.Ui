// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { resolveContainerHolidaySlot } from './container-holiday-slot.helper';

describe('resolveContainerHolidaySlot', () => {
  const ftContainer = { isHoliday: true, isWeekdayAndHoliday: false };
  const plusFtContainer = { isHoliday: false, isWeekdayAndHoliday: true };
  const plainContainer = { isHoliday: false, isWeekdayAndHoliday: false };

  it('takes the normal slot on a normal day, whatever the container flags', () => {
    for (const container of [ftContainer, plusFtContainer, plainContainer, null]) {
      expect(resolveContainerHolidaySlot(false, container)).toEqual({ isHoliday: false, isWeekdayAndHoliday: false });
    }
  });

  it('takes the generic holiday slot of an FT container on a holiday', () => {
    expect(resolveContainerHolidaySlot(true, ftContainer)).toEqual({ isHoliday: true, isWeekdayAndHoliday: false });
  });

  it('takes the holiday slot of the weekday of a +FT container on a holiday', () => {
    expect(resolveContainerHolidaySlot(true, plusFtContainer)).toEqual({ isHoliday: true, isWeekdayAndHoliday: true });
  });

  it('falls back to the holiday slot of the weekday when the container has no holiday template or is unknown', () => {
    expect(resolveContainerHolidaySlot(true, plainContainer)).toEqual({ isHoliday: true, isWeekdayAndHoliday: true });
    expect(resolveContainerHolidaySlot(true, undefined)).toEqual({ isHoliday: true, isWeekdayAndHoliday: true });
  });

  it('returns a fresh object per call', () => {
    const first = resolveContainerHolidaySlot(true, ftContainer);
    first.isHoliday = false;
    expect(resolveContainerHolidaySlot(true, ftContainer).isHoliday).toBe(true);
  });
});
