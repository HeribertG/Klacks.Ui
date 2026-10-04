// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describeDailySpanSource, isDailySpanInRange } from './daily-work-frame.helper';
import { DAILY_SPAN_SOURCE_KEYS } from 'src/app/domain/constants/daily-work-frame.constants';

describe('describeDailySpanSource', () => {
  it('reports the own rule value first', () => {
    expect(describeDailySpanSource(13.5, 14, 11)).toEqual({ key: DAILY_SPAN_SOURCE_KEYS.own, params: { hours: 13.5 } });
  });

  it('inherits the company-wide value when the rule has none', () => {
    expect(describeDailySpanSource(null, 14, 11)).toEqual({ key: DAILY_SPAN_SOURCE_KEYS.settings, params: { hours: 14 } });
  });

  it('falls back to 24h minus the minimum rest without any value', () => {
    expect(describeDailySpanSource(null, 0, 11)).toEqual({ key: DAILY_SPAN_SOURCE_KEYS.derived, params: { hours: 13 } });
  });

  it('uses the backend default rest of 11h when the rest is 0 or less', () => {
    expect(describeDailySpanSource(null, 0, 0)).toEqual({ key: DAILY_SPAN_SOURCE_KEYS.derived, params: { hours: 13 } });
  });

  it('treats an explicit 0 on the rule as 24h minus the rule rest, ignoring the company value', () => {
    expect(describeDailySpanSource(0, 14, 12)).toEqual({ key: DAILY_SPAN_SOURCE_KEYS.derived, params: { hours: 12 } });
  });
});

describe('isDailySpanInRange', () => {
  it('accepts empty and 0 to 24 hours', () => {
    expect(isDailySpanInRange(null)).toBe(true);
    expect(isDailySpanInRange(0)).toBe(true);
    expect(isDailySpanInRange(24)).toBe(true);
  });

  it('rejects negative and more than 24 hours', () => {
    expect(isDailySpanInRange(-1)).toBe(false);
    expect(isDailySpanInRange(24.5)).toBe(false);
  });
});
