// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Builds the client list CSV content with locale-aware birthdates and caller-supplied, already
 * translated column captions, so the exported file follows the application language instead of a
 * fixed Swiss layout. Column order, the comma separator and the leading byte order mark that lets
 * Excel read the UTF-8 file are unchanged.
 * @param items - Export rows as delivered by the backend export endpoint
 * @param headers - Column captions in column order, already resolved through TranslateService
 * @param locale - Active application language code, used to format the birthdate
 */

import {
  CLIENT_EXPORT_CSV_BOM,
  CLIENT_EXPORT_CSV_ESCAPED_QUOTE,
  CLIENT_EXPORT_CSV_LINE_BREAK,
  CLIENT_EXPORT_CSV_QUOTE,
  CLIENT_EXPORT_CSV_SEPARATOR,
} from 'src/app/domain/constants/client-export.constants';
import { IExportClientItem } from 'src/app/domain/models/client/i-export-client-item';
import {
  formatCalendarDate,
  LocaleDateStyle,
} from 'src/app/shared/helpers/locale-date-format.helper';

const BIRTHDATE_STYLE: LocaleDateStyle = 'numericDate';
const EMPTY_CELL = '';
const QUOTE_PATTERN = /"/g;

function toCsvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? EMPTY_CELL : String(value);
  const escaped = text.replace(QUOTE_PATTERN, CLIENT_EXPORT_CSV_ESCAPED_QUOTE);
  return `${CLIENT_EXPORT_CSV_QUOTE}${escaped}${CLIENT_EXPORT_CSV_QUOTE}`;
}

export function buildClientExportCsv(
  items: readonly IExportClientItem[],
  headers: readonly string[],
  locale: string,
): string {
  const rows: (string | number | null | undefined)[][] = items.map((item) => [
    item.idNumber,
    item.company,
    item.firstName,
    item.name,
    formatCalendarDate(item.birthdate, locale, BIRTHDATE_STYLE) ?? EMPTY_CELL,
    item.type,
  ]);

  const lines = [[...headers], ...rows].map((row) =>
    row.map(toCsvCell).join(CLIENT_EXPORT_CSV_SEPARATOR),
  );

  return CLIENT_EXPORT_CSV_BOM + lines.join(CLIENT_EXPORT_CSV_LINE_BREAK);
}
