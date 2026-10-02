// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  ReportScript,
  containsRightToLeftText,
  detectScripts,
  getFontDefinition,
  resolveHanScript,
  resolveLanguageScript,
  resolveScriptForText,
} from './report-font.model';

describe('report-font.model', () => {
  describe('resolveScriptForText', () => {
    it('keeps the standard font for characters the built-in fonts can render', () => {
      expect(resolveScriptForText('Müller GmbH – 12.05.2026', 'de')).toBe(ReportScript.WinAnsi);
      expect(resolveScriptForText('', 'de')).toBe(ReportScript.WinAnsi);
    });

    it('detects Latin Extended, Greek and Cyrillic as extended script', () => {
      expect(resolveScriptForText('Příliš žluťoučký', 'de')).toBe(ReportScript.Extended);
      expect(resolveScriptForText('Zażółć gęślą', 'de')).toBe(ReportScript.Extended);
      expect(resolveScriptForText('Înțelegere țară', 'de')).toBe(ReportScript.Extended);
      expect(resolveScriptForText('Tiếng Việt', 'de')).toBe(ReportScript.Extended);
      expect(resolveScriptForText('Ελληνικά', 'de')).toBe(ReportScript.Extended);
      expect(resolveScriptForText('Привет', 'de')).toBe(ReportScript.Extended);
    });

    it('detects the right-to-left scripts', () => {
      expect(resolveScriptForText('שלום עולם', 'de')).toBe(ReportScript.Hebrew);
      expect(resolveScriptForText('مرحبا بالعالم', 'de')).toBe(ReportScript.Arabic);
    });

    it('detects Thai', () => {
      expect(resolveScriptForText('สวัสดีชาวโลก', 'de')).toBe(ReportScript.Thai);
    });

    it('detects Kana as Japanese and Hangul as Korean regardless of the UI language', () => {
      expect(resolveScriptForText('日本語のテスト', 'de')).toBe(ReportScript.Japanese);
      expect(resolveScriptForText('한국어 테스트', 'de')).toBe(ReportScript.Korean);
    });

    it('resolves Han characters by UI language, defaulting to simplified Chinese', () => {
      expect(resolveScriptForText('排班表', 'de')).toBe(ReportScript.ChineseSimplified);
      expect(resolveScriptForText('排班表', 'zh-TW')).toBe(ReportScript.ChineseTraditional);
      expect(resolveScriptForText('勤務表', 'ja')).toBe(ReportScript.Japanese);
      expect(resolveScriptForText('근무표', 'ko')).toBe(ReportScript.Korean);
    });

    it('prefers the most specific script when scripts are mixed', () => {
      expect(resolveScriptForText('Müller 田中', 'ja')).toBe(ReportScript.Japanese);
      expect(resolveScriptForText('Bericht שלום', 'de')).toBe(ReportScript.Hebrew);
    });
  });

  describe('detectScripts', () => {
    it('returns no script when the standard fonts are sufficient', () => {
      expect(detectScripts('Grüße aus Zürich', 'de').size).toBe(0);
    });

    it('returns every script used in a text', () => {
      const scripts = detectScripts('Müller שלום สวัสดี', 'de');
      expect(scripts.has(ReportScript.Hebrew)).toBe(true);
      expect(scripts.has(ReportScript.Thai)).toBe(true);
      expect(scripts.has(ReportScript.WinAnsi)).toBe(false);
    });
  });

  describe('resolveHanScript', () => {
    it('falls back to simplified Chinese for unknown languages', () => {
      expect(resolveHanScript('')).toBe(ReportScript.ChineseSimplified);
      expect(resolveHanScript('fr')).toBe(ReportScript.ChineseSimplified);
    });
  });

  describe('getFontDefinition', () => {
    it('provides a font file for every detectable script', () => {
      const scripts = [
        ReportScript.Extended,
        ReportScript.Hebrew,
        ReportScript.Arabic,
        ReportScript.Thai,
        ReportScript.Japanese,
        ReportScript.Korean,
        ReportScript.ChineseSimplified,
        ReportScript.ChineseTraditional,
      ];
      for (const script of scripts) {
        expect(getFontDefinition(script)?.regularFile).toBeTruthy();
      }
    });

    it('has no font for WinAnsi because the built-in fonts cover it', () => {
      expect(getFontDefinition(ReportScript.WinAnsi)).toBeUndefined();
    });
  });

  describe('resolveLanguageScript', () => {
    it('maps every language outside WinAnsi to the font its labels need', () => {
      expect(resolveLanguageScript('ar')).toBe(ReportScript.Arabic);
      expect(resolveLanguageScript('he')).toBe(ReportScript.Hebrew);
      expect(resolveLanguageScript('th')).toBe(ReportScript.Thai);
      expect(resolveLanguageScript('ja')).toBe(ReportScript.Japanese);
      expect(resolveLanguageScript('ko')).toBe(ReportScript.Korean);
      expect(resolveLanguageScript('zh-CN')).toBe(ReportScript.ChineseSimplified);
      expect(resolveLanguageScript('zh-TW')).toBe(ReportScript.ChineseTraditional);
      for (const language of ['cs', 'el', 'pl', 'ro', 'vi']) {
        expect(resolveLanguageScript(language)).toBe(ReportScript.Extended);
      }
    });

    it('needs no embedded font for the WinAnsi languages', () => {
      for (const language of ['de', 'en', 'fr', 'it', 'da', 'es', 'fi', 'id', 'ms', 'nb', 'nl', 'pt', 'sv', '']) {
        expect(resolveLanguageScript(language)).toBe(ReportScript.WinAnsi);
      }
    });
  });

  describe('containsRightToLeftText', () => {
    it('detects Hebrew and Arabic only', () => {
      expect(containsRightToLeftText('סיכום 12')).toBe(true);
      expect(containsRightToLeftText('ملخص المسار')).toBe(true);
      expect(containsRightToLeftText('Route 12 – Zürich')).toBe(false);
      expect(containsRightToLeftText('สรุปเส้นทาง')).toBe(false);
      expect(containsRightToLeftText('')).toBe(false);
    });
  });
});
