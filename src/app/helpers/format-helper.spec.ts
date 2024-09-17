import { isNumeric } from './format-helper';
import { replaceUmlaud } from './format-helper';
import { validateEmail } from './format-helper';

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
      expect(validateEmail(undefined as any)).toBeFalse();
    });
  });
});
