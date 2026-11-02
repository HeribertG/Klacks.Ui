// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  DATEV_NUMBER_RANGES,
  DatevNumberErrorKeys,
  DatevNumberFields,
} from 'src/app/domain/constants/datev-numbers.constants';
import { datevNumberErrorKey, parseDatevNumber } from './datev-number.helper';

describe('datev-number.helper', () => {
  const consultant = DATEV_NUMBER_RANGES[DatevNumberFields.Consultant];
  const client = DATEV_NUMBER_RANGES[DatevNumberFields.Client];

  describe('datevNumberErrorKey', () => {
    it('accepts an empty entry', () => {
      expect(datevNumberErrorKey('', consultant)).toBeNull();
      expect(datevNumberErrorKey('   ', client)).toBeNull();
    });

    it('accepts the bounds of the consultant range', () => {
      expect(datevNumberErrorKey('1001', consultant)).toBeNull();
      expect(datevNumberErrorKey('9999999', consultant)).toBeNull();
    });

    it('accepts the bounds of the client range', () => {
      expect(datevNumberErrorKey('1', client)).toBeNull();
      expect(datevNumberErrorKey('99999', client)).toBeNull();
    });

    it('rejects values outside the range', () => {
      expect(datevNumberErrorKey('1000', consultant)).toBe(DatevNumberErrorKeys.OutOfRange);
      expect(datevNumberErrorKey('999', consultant)).toBe(DatevNumberErrorKeys.OutOfRange);
      expect(datevNumberErrorKey('10000000', consultant)).toBe(DatevNumberErrorKeys.OutOfRange);
      expect(datevNumberErrorKey('0', client)).toBe(DatevNumberErrorKeys.OutOfRange);
      expect(datevNumberErrorKey('100000', client)).toBe(DatevNumberErrorKeys.OutOfRange);
    });

    it('rejects non-integer text', () => {
      expect(datevNumberErrorKey('12.5', client)).toBe(DatevNumberErrorKeys.NotInteger);
      expect(datevNumberErrorKey('-5', client)).toBe(DatevNumberErrorKeys.NotInteger);
      expect(datevNumberErrorKey('1e3', consultant)).toBe(DatevNumberErrorKeys.NotInteger);
    });

    it('rejects text the browser reports as bad input even though the value is empty', () => {
      expect(datevNumberErrorKey('', client, true)).toBe(DatevNumberErrorKeys.NotInteger);
    });
  });

  describe('parseDatevNumber', () => {
    it('returns null for an empty or non-numeric entry', () => {
      expect(parseDatevNumber('')).toBeNull();
      expect(parseDatevNumber('abc')).toBeNull();
    });

    it('returns the whole number', () => {
      expect(parseDatevNumber(' 12345 ')).toBe(12345);
    });
  });
});
