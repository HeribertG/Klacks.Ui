// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { CollisionDetectionService } from 'src/app/domain/services/schedule/collision-detection.service';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { ShowInScheduleService } from 'src/app/presentation/workplace/schedule/services/show-in-schedule.service';
import {
  ARABIC_INDIC_DIGITS,
  CELL_DATE_EXPECTATIONS,
  CELL_DATE_LOCALES,
} from 'src/app/shared/testing/calendar-date-cell.testing';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { ScheduleErrorListPdfExportService } from './schedule-error-list-pdf-export.service';
import { ScheduleErrorListComponent } from './schedule-error-list.component';

const CLIENT_ID = 'c1';
const EARLIER_DAY = '2026-12-25';
const LATER_DAY = '2026-12-31T00:00:00Z';

function entry(date: string, comment: string): ScheduleErrorEntry {
  return { type: 'error', date, clientId: CLIENT_ID, clientName: 'Mueller', comment };
}

describe('ScheduleErrorListComponent date column', () => {
  const entries = signal<ScheduleErrorEntry[]>([]);
  const showInSchedule = { showScheduleByClient: vi.fn() };

  beforeEach(async () => {
    entries.set([entry(LATER_DAY, 'second'), entry(EARLIER_DAY, 'first')]);
    showInSchedule.showScheduleByClient.mockClear();
    TestBed.configureTestingModule({
      imports: [ScheduleErrorListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: CollisionDetectionService, useValue: { errorEntries: entries } },
        { provide: ShowInScheduleService, useValue: showInSchedule },
        { provide: ScheduleErrorListPdfExportService, useValue: { exportToPdf: vi.fn() } },
      ],
    });
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(CELL_DATE_LOCALES.map((code) => loader.ensureLoaded(code)));
  });

  function render(locale: string): HTMLElement {
    TestBed.inject(LocaleService).setLocale(locale);
    const fixture = TestBed.createComponent(ScheduleErrorListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function dateCells(host: HTMLElement): string[] {
    return Array.from(host.querySelectorAll('td.col-date')).map((cell) => cell.textContent?.trim() ?? '');
  }

  it.each(CELL_DATE_EXPECTATIONS)('shows the date column in %s as %s', (locale, expected) => {
    const cells = dateCells(render(locale));

    expect(cells[1]).toBe(expected);
  });

  it('keeps Latin digits and a Gregorian year for arabic', () => {
    const cell = dateCells(render('ar'))[1];

    expect(cell).toMatch(/2026/);
    expect(cell).not.toMatch(ARABIC_INDIC_DIGITS);
  });

  it('keeps the row order of the service and hands the raw date to the schedule on click', () => {
    const host = render('de');

    expect(dateCells(host)).toEqual(['31.12.2026', '25.12.2026']);
    const rows = host.querySelectorAll<HTMLElement>('tbody tr.table-row');
    rows[1].click();

    expect(showInSchedule.showScheduleByClient).toHaveBeenCalledWith(CLIENT_ID, EARLIER_DAY);
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('shows the wire days unshifted', () => {
        expect(dateCells(render('de'))).toEqual(['31.12.2026', '25.12.2026']);
      });
    });
  }
});
