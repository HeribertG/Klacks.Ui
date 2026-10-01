import { describe, it, expect } from 'vitest';
import {
  parseTimeSpanToSeconds,
  formatTimeSpanHHMM,
  sumTimeSpansToSeconds,
} from './time-span-format.helper';

describe('time-span-format.helper', () => {
  describe('parseTimeSpanToSeconds', () => {
    it('parses a .NET TimeSpan with fractional seconds', () => {
      expect(parseTimeSpanToSeconds('02:47:44.4861675')).toBeCloseTo(10064.486, 2);
    });

    it('parses hh:mm and hh:mm:ss', () => {
      expect(parseTimeSpanToSeconds('00:05')).toBe(300);
      expect(parseTimeSpanToSeconds('01:30:15')).toBe(5415);
    });

    it('parses the .NET day prefix d.hh:mm:ss', () => {
      expect(parseTimeSpanToSeconds('1.02:03:04')).toBe(86400 + 2 * 3600 + 3 * 60 + 4);
    });

    it('parses negative spans', () => {
      expect(parseTimeSpanToSeconds('-00:10:00')).toBe(-600);
    });

    it('returns 0 for empty or invalid input', () => {
      expect(parseTimeSpanToSeconds('')).toBe(0);
      expect(parseTimeSpanToSeconds(null)).toBe(0);
      expect(parseTimeSpanToSeconds(undefined)).toBe(0);
      expect(parseTimeSpanToSeconds('abc')).toBe(0);
    });
  });

  describe('formatTimeSpanHHMM', () => {
    it('formats a raw .NET TimeSpan as HH:mm without seconds or ticks', () => {
      expect(formatTimeSpanHHMM('02:47:44.4861675')).toBe('02:48');
    });

    it('rounds to the nearest minute', () => {
      expect(formatTimeSpanHHMM('00:17:29.9')).toBe('00:17');
      expect(formatTimeSpanHHMM('00:17:30')).toBe('00:18');
    });

    it('formats short spans', () => {
      expect(formatTimeSpanHHMM('00:00:00')).toBe('00:00');
      expect(formatTimeSpanHHMM('00:05')).toBe('00:05');
    });

    it('folds days into hours', () => {
      expect(formatTimeSpanHHMM('1.02:03:00')).toBe('26:03');
    });

    it('returns an empty string for empty input', () => {
      expect(formatTimeSpanHHMM('')).toBe('');
      expect(formatTimeSpanHHMM(null)).toBe('');
    });
  });

  describe('sumTimeSpansToSeconds', () => {
    it('sums the spans', () => {
      expect(sumTimeSpansToSeconds(['00:02:57.97', '00:03:40.42', undefined])).toBeCloseTo(398.39, 1);
    });
  });
});
