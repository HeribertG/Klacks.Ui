// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { WorkFilter } from './schedule-class';
import { setCompanyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { useTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('WorkFilter default period', () => {
  useTimeZone('America/New_York');

  const NEW_YEAR_EVE_UTC = '2025-12-31T20:00:00Z';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NEW_YEAR_EVE_UTC));
  });

  afterEach(() => {
    vi.useRealTimers();
    setCompanyTimeZone(null);
  });

  it('follows the browser zone when no company zone is set', () => {
    const filter = new WorkFilter();

    expect(filter.currentYear).toBe(2025);
    expect(filter.currentMonth).toBe(12);
  });

  it('follows the company zone (Pacific/Auckland) instead of the browser zone (America/New_York)', () => {
    setCompanyTimeZone('Pacific/Auckland');

    const filter = new WorkFilter();

    expect(filter.currentYear).toBe(2026);
    expect(filter.currentMonth).toBe(1);
  });
});
