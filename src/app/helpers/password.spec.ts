import {
  PasswordCheckStrength,
  checkPasswordStrength,
  generatePassword,
} from './password';

describe('Password Utilities', () => {
  describe('generatePassword', () => {
    it('should generate a password of correct length', () => {
      const length = 10;
      const password = generatePassword(length);
      expect(password.length).toBe(length);
    });

    it('should contain at least one lowercase, uppercase, digit, and special character', () => {
      const password = generatePassword(8);
      expect(password).toMatch(/[a-z]/); // lowercase
      expect(password).toMatch(/[A-Z]/); // uppercase
      expect(password).toMatch(/[0-9]/); // digit
      expect(password).toMatch(/[@#?!]/); // special character
    });
  });

  describe('checkPasswordStrength', () => {
    it('should return Short for passwords shorter than minimum length', () => {
      const password = 'Ab1@';
      expect(checkPasswordStrength(password)).toBe(PasswordCheckStrength.Short);
    });

    it('should return Common for common passwords', () => {
      const password = 'password123';
      expect(checkPasswordStrength(password)).toBe(
        PasswordCheckStrength.Common
      );
    });

    it('should return Weak for weak passwords', () => {
      const password = 'abcdefgh';
      expect(checkPasswordStrength(password)).toBe(PasswordCheckStrength.Weak);
    });

    it('should return Ok for moderate passwords', () => {
      const password = 'Abcdefgh';
      expect(checkPasswordStrength(password)).toBe(PasswordCheckStrength.Ok);
    });

    it('should return Strong for strong passwords', () => {
      const password = 'Ab1@dEf3';
      expect(checkPasswordStrength(password)).toBe(
        PasswordCheckStrength.Strong
      );
    });
  });
});
