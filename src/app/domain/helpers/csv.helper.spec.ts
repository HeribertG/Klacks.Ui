// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { buildCsvRow, escapeCsvValue } from './csv.helper';

describe('csv.helper', () => {
  describe('escapeCsvValue', () => {
    it('leaves plain values untouched', () => {
      expect(escapeCsvValue('Müller')).toBe('Müller');
      expect(escapeCsvValue('8.50')).toBe('8.50');
    });

    it('treats missing values as empty', () => {
      expect(escapeCsvValue(undefined)).toBe('');
      expect(escapeCsvValue(null)).toBe('');
    });

    it('quotes values containing the separator', () => {
      expect(escapeCsvValue('Müller; Hans')).toBe('"Müller; Hans"');
    });

    it('quotes and doubles embedded quotes', () => {
      expect(escapeCsvValue('Schicht "Nacht"')).toBe('"Schicht ""Nacht"""');
    });

    it('quotes values spanning several lines', () => {
      expect(escapeCsvValue('Zeile 1\nZeile 2')).toBe('"Zeile 1\nZeile 2"');
      expect(escapeCsvValue('Zeile 1\r\nZeile 2')).toBe('"Zeile 1\r\nZeile 2"');
    });
  });

  describe('buildCsvRow', () => {
    it('joins cells with the separator', () => {
      expect(buildCsvRow(['01.05.2026', 'Frühdienst', '8.00'])).toBe('01.05.2026;Frühdienst;8.00');
    });

    it('escapes each cell independently', () => {
      expect(buildCsvRow(['a;b', 'c"d', undefined])).toBe('"a;b";"c""d";');
    });
  });
});
