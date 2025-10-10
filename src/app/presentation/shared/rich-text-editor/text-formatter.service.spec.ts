import { TestBed } from '@angular/core/testing';
import { TextFormatterService } from './text-formatter.service';

describe('TextFormatterService', () => {
  let service: TextFormatterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TextFormatterService],
    });
    service = TestBed.inject(TextFormatterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('stripFormatting', () => {
    it('should remove HTML tags and return plain text', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const result = service.stripFormatting(html);
      expect(result).toBe('Hello World');
    });

    it('should handle nested HTML tags', () => {
      const html = '<div><p>Test <b><i>nested</i></b> tags</p></div>';
      const result = service.stripFormatting(html);
      expect(result).toBe('Test nested tags');
    });

    it('should handle empty string', () => {
      const html = '';
      const result = service.stripFormatting(html);
      expect(result).toBe('');
    });

    it('should handle plain text without HTML tags', () => {
      const text = 'Plain text without tags';
      const result = service.stripFormatting(text);
      expect(result).toBe('Plain text without tags');
    });

    it('should handle text with line breaks', () => {
      const html = '<p>Line 1</p><p>Line 2</p>';
      const result = service.stripFormatting(html);
      expect(result).toBe('Line 1Line 2');
    });

    it('should handle lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = service.stripFormatting(html);
      expect(result).toBe('Item 1Item 2');
    });

    it('should handle special characters', () => {
      const html = '<p>&lt;Test&gt; &amp; &quot;quotes&quot;</p>';
      const result = service.stripFormatting(html);
      expect(result).toBe('<Test> & "quotes"');
    });

    it('should handle bold text', () => {
      const html = '<b>Bold text</b>';
      const result = service.stripFormatting(html);
      expect(result).toBe('Bold text');
    });

    it('should handle italic text', () => {
      const html = '<i>Italic text</i>';
      const result = service.stripFormatting(html);
      expect(result).toBe('Italic text');
    });

    it('should handle underlined text', () => {
      const html = '<u>Underlined text</u>';
      const result = service.stripFormatting(html);
      expect(result).toBe('Underlined text');
    });

    it('should handle mixed formatting', () => {
      const html = '<p>This is <b>bold</b>, <i>italic</i>, and <u>underlined</u> text.</p>';
      const result = service.stripFormatting(html);
      expect(result).toBe('This is bold, italic, and underlined text.');
    });

    it('should handle text with alignment', () => {
      const html = '<div style="text-align: center">Centered text</div>';
      const result = service.stripFormatting(html);
      expect(result).toBe('Centered text');
    });
  });
});
