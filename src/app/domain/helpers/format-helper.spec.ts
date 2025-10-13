import { isNumeric, replaceUmlaud, validateEmail, DateToString, DateToStringShort, dateWithLocalTimeCorrection, utcToLocalDate } from './format-helper';

describe('Utility Functions', () => {
  describe('isNumeric', () => {
    it('should return true for numeric values', () => {
      const numericValues = [123, '123', '123.45', -123, '-123.45'];

      numericValues.forEach((value) => {
        expect(isNumeric(value)).toBeTrue();
      });
    });

    it('should return false for non-numeric values', () => {
      const nonNumericValues = [
        'abc',
        '',
        null,
        undefined,
        {},
        [],
        true,
        false,
      ];

      nonNumericValues.forEach((value) => {
        expect(isNumeric(value)).toBeFalse();
      });
    });
  });

  describe('replaceUmlaut', () => {
    it('should replace lowercase umlauts', () => {
      const input = 'äöüss';
      const output = replaceUmlaud(input);
      expect(output).toEqual('aouss');
    });

    it('should replace lowercase umlauts', () => {
      const input = 'ÄÖÜ';
      const output = replaceUmlaud(input);
      expect(output).toEqual('aou');
    });

    it('should handle strings without umlauts', () => {
      const input = 'abcd';
      const output = replaceUmlaud(input);
      expect(output).toEqual('abcd');
    });

    it('should handle empty strings', () => {
      const output = replaceUmlaud('');
      expect(output).toEqual('');
    });

    it('should handle strings', () => {
      const input = 'AäBbÖoÜu';
      const output = replaceUmlaud(input);
      expect(output).toEqual('aabboouu');
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'test.email@example.com',
        'user+name@example.com',
        'test.email+alex@leetcode.com',
      ];

      validEmails.forEach((email) => {
        expect(validateEmail(email)).toBeTrue();
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingusername.com',
        'username@.com',
        'username@.com.com',
        'username@.com.',
        '.username@example.com',
      ];

      invalidEmails.forEach((email) => {
        expect(validateEmail(email)).toBeFalse();
      });
    });

    it('should return false for empty string', () => {
      expect(validateEmail('')).toBeFalse();
    });

    it('should return false for undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validateEmail(undefined as any)).toBeFalse();
    });
  });

  describe('date-fns migration tests', () => {
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
});
