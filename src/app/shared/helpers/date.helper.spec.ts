import {
  DateToString,
  DateToStringShort,
  dateWithLocalTimeCorrection,
  utcToLocalDate,
} from './date.helper';

describe('Date Helper Functions', () => {
  describe('DateToString', () => {
    it('should format date with full weekday name (German)', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = DateToString(date, 'de');
      expect(result).toContain('15.03.2024');
      expect(result).toContain('Freitag');
    });

    it('should format date with full weekday name (English)', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = DateToString(date, 'en');
      expect(result).toContain('15.03.2024');
      expect(result).toContain('Friday');
    });
  });

  describe('DateToStringShort', () => {
    it('should format date without weekday', () => {
      const date = new Date('2024-03-15T00:00:00');
      const result = DateToStringShort(date, 'de');
      expect(result).toBe('15.03.2024');
    });
  });

  describe('dateWithLocalTimeCorrection', () => {
    it('should handle date with timezone correction', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      const result = dateWithLocalTimeCorrection(date);
      expect(result).toBeDefined();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getDate()).toBe(15);
    });

    it('should return undefined for null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = dateWithLocalTimeCorrection(null as any);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      const result = dateWithLocalTimeCorrection(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('utcToLocalDate', () => {
    it('should convert UTC to local date', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      const result = utcToLocalDate(date);
      expect(result).toBeDefined();
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should return undefined for null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = utcToLocalDate(null as any);
      expect(result).toBeUndefined();
    });
  });
});
