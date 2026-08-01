import { describe, expect, it } from 'vitest';
import { sanitizeStoredHtml } from './html-sanitizer.helper';

describe('sanitizeStoredHtml', () => {
  describe('formatting that must survive', () => {
    it('keeps the style attribute used for text alignment', () => {
      const result = sanitizeStoredHtml(
        '<div style="text-align: center">Centered</div>'
      );

      expect(result).toContain('text-align');
      expect(result).toContain('Centered');
    });

    it('keeps the tags produced by the rich text editor toolbar', () => {
      const result = sanitizeStoredHtml(
        '<p><b>bold</b><i>italic</i><u>underline</u></p><ul><li>item</li></ul>'
      );

      expect(result).toContain('<b>bold</b>');
      expect(result).toContain('<i>italic</i>');
      expect(result).toContain('<u>underline</u>');
      expect(result).toContain('<li>item</li>');
    });

    it('keeps tables and images from pasted or received content', () => {
      const result = sanitizeStoredHtml(
        '<table><tr><td>cell</td></tr></table><img src="https://example.com/a.png">'
      );

      expect(result).toContain('<td>cell</td>');
      expect(result).toContain('<img');
    });

    it('keeps links', () => {
      const result = sanitizeStoredHtml('<a href="https://example.com">link</a>');

      expect(result).toContain('href="https://example.com"');
    });
  });

  describe('content that must be removed', () => {
    it('removes event handler attributes on allowed tags', () => {
      const result = sanitizeStoredHtml('<b onmouseover="alert(1)">text</b>');

      expect(result).not.toContain('onmouseover');
      expect(result).toContain('text');
    });

    it('removes style blocks, which would apply to the whole page', () => {
      const result = sanitizeStoredHtml(
        '<style>body{display:none}</style><p>text</p>'
      );

      expect(result).not.toContain('display:none');
      expect(result).not.toContain('<style');
      expect(result).toContain('<p>text</p>');
    });

    it('removes form controls used for phishing', () => {
      const result = sanitizeStoredHtml(
        '<form action="https://evil.example"><input name="password"><button>Send</button></form>'
      );

      expect(result).not.toContain('<form');
      expect(result).not.toContain('<input');
      expect(result).not.toContain('<button');
    });

    it('removes scripts and iframes', () => {
      const result = sanitizeStoredHtml(
        '<script>alert(1)</script><iframe src="https://evil.example"></iframe><p>text</p>'
      );

      expect(result).not.toContain('<script');
      expect(result).not.toContain('<iframe');
      expect(result).toContain('<p>text</p>');
    });

    it('removes javascript: URLs', () => {
      const result = sanitizeStoredHtml('<a href="javascript:alert(1)">link</a>');

      expect(result).not.toContain('javascript:');
    });

    it('removes data attributes', () => {
      const result = sanitizeStoredHtml('<p data-tracking="1">text</p>');

      expect(result).not.toContain('data-tracking');
    });
  });

  describe('edge cases', () => {
    it('returns an empty string for empty input', () => {
      expect(sanitizeStoredHtml('')).toBe('');
    });

    it('leaves plain text untouched', () => {
      expect(sanitizeStoredHtml('just text')).toBe('just text');
    });
  });
});
