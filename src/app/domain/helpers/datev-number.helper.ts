// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure validation and parsing of a DATEV consultant or client number typed into a settings field.
 * An empty entry is valid and means "no number stored".
 * @param raw - Text of the input field
 * @param range - Inclusive lower and upper bound of the allowed number
 * @param hasBadInput - True when the browser reports text that is not a number at all (type="number" yields an empty value then)
 */

import { DatevNumberErrorKeys } from 'src/app/domain/constants/datev-numbers.constants';
import { NumberRange } from 'src/app/domain/models/settings/number-range.interface';

const WHOLE_NUMBER_PATTERN = /^\d+$/;

export function datevNumberErrorKey(raw: string, range: NumberRange, hasBadInput = false): string | null {
  const text = raw.trim();
  if (hasBadInput) {
    return DatevNumberErrorKeys.NotInteger;
  }
  if (text === '') {
    return null;
  }
  if (!WHOLE_NUMBER_PATTERN.test(text)) {
    return DatevNumberErrorKeys.NotInteger;
  }
  const value = Number(text);
  return value < range.min || value > range.max ? DatevNumberErrorKeys.OutOfRange : null;
}

export function parseDatevNumber(raw: string): number | null {
  const text = raw.trim();
  return WHOLE_NUMBER_PATTERN.test(text) ? Number(text) : null;
}
