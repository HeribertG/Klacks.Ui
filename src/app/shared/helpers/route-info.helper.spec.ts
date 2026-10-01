import { describe, it, expect } from 'vitest';
import { calculateRouteDrivingMinutes, calculateRouteDrivingSeconds } from './route-info.helper';

describe('route-info.helper', () => {
  it('sums the legs of all route steps', () => {
    const seconds = calculateRouteDrivingSeconds([
      { travelTimeToNext: '00:02:57.9733995' },
      { travelTimeToNext: '00:03:40.4197401' },
      { travelTimeToNext: '00:00:00' },
    ]);

    expect(seconds).toBeCloseTo(398.39, 1);
  });

  it('returns 0 for a missing or empty route', () => {
    expect(calculateRouteDrivingSeconds(undefined)).toBe(0);
    expect(calculateRouteDrivingSeconds(null)).toBe(0);
    expect(calculateRouteDrivingSeconds([])).toBe(0);
  });

  it('sums whole minutes per leg so the total equals the displayed legs', () => {
    const minutes = calculateRouteDrivingMinutes([
      { travelTimeToNext: '00:02:57.97' },
      { travelTimeToNext: '00:03:40.42' },
      { travelTimeToNext: '00:05:53.50' },
      { travelTimeToNext: '00:02:57.41' },
      { travelTimeToNext: '00:02:15.18' },
      { travelTimeToNext: '00:00:00' },
    ]);

    expect(minutes).toBe(18);
    expect(calculateRouteDrivingMinutes(undefined)).toBe(0);
  });
});
