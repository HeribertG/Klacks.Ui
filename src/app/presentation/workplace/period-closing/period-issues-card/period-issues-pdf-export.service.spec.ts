// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { PeriodIssue } from 'src/app/infrastructure/api/period-closing/models/period-issue';
import { PdfUnicodeTextService } from 'src/app/domain/services/report/pdf-unicode-text.service';
import {
  ARABIC_INDIC_DIGITS,
  CELL_DATE_EXPECTATIONS,
  CELL_DATE_LOCALES,
  CELL_DATE_WIRE_VALUE,
} from 'src/app/shared/testing/calendar-date-cell.testing';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { PeriodIssuesPdfExportService } from './period-issues-pdf-export.service';

const DATE_COLUMN_INDEX = 1;

const autoTableCalls = vi.hoisted(() => [] as { body: string[][] }[]);

vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { width: 297, height: 210, getWidth: () => 297, getHeight: () => 210 } };
    setFontSize = vi.fn();
    setFont = vi.fn();
    text = vi.fn();
    setPage = vi.fn();
    getNumberOfPages = () => 1;
    output = () => new Blob();
  },
}));
vi.mock('jspdf-autotable', () => ({
  default: (_pdf: unknown, options: { body: string[][] }) => autoTableCalls.push(options),
}));
vi.mock('src/app/shared/helpers/file-download.helper', () => ({
  openPendingBlobTab: () => ({ show: vi.fn(), cancel: vi.fn() }),
}));

describe('PeriodIssuesPdfExportService date column', () => {
  let service: PeriodIssuesPdfExportService;

  const issues: PeriodIssue[] = [
    {
      date: CELL_DATE_WIRE_VALUE,
      clientId: 'c1',
      clientName: 'Mueller',
      severity: 'error',
      code: 'ScheduleNote',
      messageKey: 'text',
      messageParams: {},
    },
  ];

  beforeEach(async () => {
    autoTableCalls.length = 0;
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [{ provide: PdfUnicodeTextService, useValue: { prepareDocument: vi.fn() } }],
    });
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(CELL_DATE_LOCALES.map((code) => loader.ensureLoaded(code)));
    service = TestBed.inject(PeriodIssuesPdfExportService);
  });

  async function exportedDateCell(locale: string, date = CELL_DATE_WIRE_VALUE): Promise<string> {
    TestBed.inject(LocaleService).setLocale(locale);
    await service.exportToPdf([{ ...issues[0], date }], 'December 2026', 0, false);
    return autoTableCalls[0].body[0][DATE_COLUMN_INDEX];
  }

  it.each(CELL_DATE_EXPECTATIONS)('writes the date in %s as %s', async (locale, expected) => {
    expect(await exportedDateCell(locale)).toBe(expected);
  });

  it('keeps Latin digits and a Gregorian year for arabic', async () => {
    const cell = await exportedDateCell('ar');

    expect(cell).toMatch(/2026/);
    expect(cell).not.toMatch(ARABIC_INDIC_DIGITS);
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
