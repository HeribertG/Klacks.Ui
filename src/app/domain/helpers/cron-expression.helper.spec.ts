import { isValidCronExpression } from './cron-expression.helper';

describe('isValidCronExpression', () => {
  it('accepts the hourly default expression', () => {
    expect(isValidCronExpression('0 * * * *')).toBe(true);
  });

  it('accepts steps, ranges and lists', () => {
    expect(isValidCronExpression('*/15 8-18 1,15 * *')).toBe(true);
  });

  it('accepts month and weekday names', () => {
    expect(isValidCronExpression('0 12 * JAN-MAR SAT,SUN')).toBe(true);
  });

  it('accepts surrounding whitespace', () => {
    expect(isValidCronExpression('  0 * * * *  ')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidCronExpression('')).toBe(false);
  });

  it('rejects fewer than five fields', () => {
    expect(isValidCronExpression('0 * * *')).toBe(false);
  });

  it('rejects more than five fields', () => {
    expect(isValidCronExpression('0 0 * * * *')).toBe(false);
  });

  it('rejects prose input', () => {
    expect(isValidCronExpression('every single hour ok now')).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(isValidCronExpression('0 * * * $')).toBe(false);
  });
});
