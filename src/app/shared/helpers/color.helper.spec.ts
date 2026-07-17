// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { DEFAULT_SVG_FILL_COLOR, isValidCssColor, sanitizeCssColor } from './color.helper';

describe('Color Helper Functions', () => {
  describe('isValidCssColor', () => {
    it('should accept 3/6/8-digit hex colors', () => {
      expect(isValidCssColor('#fff')).toBe(true);
      expect(isValidCssColor('#ff0000')).toBe(true);
      expect(isValidCssColor('#ff0000cc')).toBe(true);
    });

    it('should accept numeric rgb()/rgba() values', () => {
      expect(isValidCssColor('rgb(255, 0, 0)')).toBe(true);
      expect(isValidCssColor('rgba(255, 0, 0, 0.5)')).toBe(true);
      expect(isValidCssColor('rgba(255,0,0,1)')).toBe(true);
    });

    it('should accept known safe keywords', () => {
      expect(isValidCssColor('transparent')).toBe(true);
      expect(isValidCssColor('currentColor')).toBe(true);
    });

    it('should reject malicious strings trying to break out of the SVG attribute', () => {
      expect(isValidCssColor('red" onload="alert(document.cookie)')).toBe(false);
      expect(isValidCssColor('"><script>alert(1)</script>')).toBe(false);
      expect(isValidCssColor('javascript:alert(1)')).toBe(false);
    });

    it('should reject empty, null and undefined values', () => {
      expect(isValidCssColor('')).toBe(false);
      expect(isValidCssColor(null)).toBe(false);
      expect(isValidCssColor(undefined)).toBe(false);
    });

    it('should reject non-numeric rgb() components', () => {
      expect(isValidCssColor('rgb(a, b, c)')).toBe(false);
    });
  });

  describe('sanitizeCssColor', () => {
    it('should pass through a valid hex color unchanged', () => {
      expect(sanitizeCssColor('#ff0000')).toBe('#ff0000');
    });

    it('should fall back to the default color for a malicious value', () => {
      expect(sanitizeCssColor('red" onload="alert(document.cookie)')).toBe(
        DEFAULT_SVG_FILL_COLOR
      );
    });

    it('should fall back to a custom default when provided', () => {
      expect(sanitizeCssColor('not-a-color', '#000000')).toBe('#000000');
    });

    it('should fall back to the default color for undefined input', () => {
      expect(sanitizeCssColor(undefined)).toBe(DEFAULT_SVG_FILL_COLOR);
    });
  });
});
