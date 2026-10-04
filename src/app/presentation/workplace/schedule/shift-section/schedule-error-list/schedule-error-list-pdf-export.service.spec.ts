// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { jsPDF } from 'jspdf';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { PdfUnicodeTextService } from 'src/app/domain/services/report/pdf-unicode-text.service';
import {
  ARABIC_INDIC_DIGITS,
  CELL_DATE_EXPECTATIONS,
  CELL_DATE_LOCALES,
  CELL_DATE_WIRE_VALUE,
} from 'src/app/shared/testing/calendar-date-cell.testing';
import { autoTableBodyCell, stubPdfTabAndBlobUrl } from 'src/app/shared/testing/pdf-table-capture.testing';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { ScheduleErrorListPdfExportService } from './schedule-error-list-pdf-export.service';

const DATE_COLUMN_INDEX = 1;
const COMMENT_COLUMN_INDEX = 3;

describe('ScheduleErrorListPdfExportService date column', () => {
  let prepareDocument: ReturnType<typeof vi.fn>;
  let restoreBrowserApis: () => void;
  let service: ScheduleErrorListPdfExportService;

  const entries: ScheduleErrorEntry[] = [
    { type: 'error', date: CELL_DATE_WIRE_VALUE, clientId: 'c1', clientName: 'Mueller', comment: 'text' },
  ];

  beforeEach(async () => {
    restoreBrowserApis = stubPdfTabAndBlobUrl();
    prepareDocument = vi.fn();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [{ provide: PdfUnicodeTextService, useValue: { prepareDocument } }],
    });
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(CELL_DATE_LOCALES.map((code) => loader.ensureLoaded(code)));
    service = TestBed.inject(ScheduleErrorListPdfExportService);
  });

  afterEach(() => {
    restoreBrowserApis();
  });

  async function exportedDateCell(locale: string, date = CELL_DATE_WIRE_VALUE): Promise<string> {
    TestBed.inject(LocaleService).setLocale(locale);
    await service.exportToPdf([{ ...entries[0], date }]);
    return autoTableBodyCell(prepareDocument.mock.calls[0][0] as jsPDF, 0, DATE_COLUMN_INDEX);
  }

  it.each(CELL_DATE_EXPECTATIONS)('writes the date in %s as %s', async (locale, expected) => {
    expect(await exportedDateCell(locale)).toBe(expected);
  });

  it('keeps Latin digits and a Gregorian year for arabic', async () => {
    const cell = await exportedDateCell('ar');

    expect(cell).toMatch(/2026/);
    expect(cell).not.toMatch(ARABIC_INDIC_DIGITS);
  });

  it('appends the pre-existing marker to the comment of a marked finding', async () => {
    TestBed.inject(LocaleService).setLocale('de');
    await service.exportToPdf([{ ...entries[0], preExisting: true }, entries[0]]);
    const pdf = prepareDocument.mock.calls[0][0] as jsPDF;

    expect(autoTableBodyCell(pdf, 0, COMMENT_COLUMN_INDEX)).toBe('text (schedule.error-list.pre-existing)');
    expect(autoTableBodyCell(pdf, 1, COMMENT_COLUMN_INDEX)).toBe('text');
  });

  it('leaves an unparsable value as sent', async () => {
    expect(await exportedDateCell('de', 'not-a-date')).toBe('not-a-date');
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it.each([CELL_DATE_WIRE_VALUE, `${CELL_DATE_WIRE_VALUE}T00:00:00Z`])(
        'writes %s on its own day',
        async (wireValue) => {
          expect(await exportedDateCell('de', wireValue)).toBe('25.12.2026');
        },
      );
    });
  }
});
