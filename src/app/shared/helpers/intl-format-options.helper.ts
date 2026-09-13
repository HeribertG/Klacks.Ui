// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single source for the Intl.DateTimeFormat options that pin the Gregorian calendar and Latin
 * digits, shared by every date formatter in the app (calendar dates, company instants and the
 * company "today" anchor). Both pins are a correctness requirement, not cosmetics: a locale whose
 * default calendar is Buddhist or Hijri (th, ar) would otherwise render a different year, and a
 * locale whose default numbering system is not Latin would render digits that Number() cannot read
 * back. Spread this constant into a preset first and add the field options after it.
 */

export const GREGORIAN_LATIN_INTL_OPTIONS: Intl.DateTimeFormatOptions = {
  calendar: 'gregory',
  numberingSystem: 'latn',
};
