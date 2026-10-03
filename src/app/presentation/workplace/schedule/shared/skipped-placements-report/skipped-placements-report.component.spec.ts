// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SkippedPlacementsReportComponent } from './skipped-placements-report.component';
import { SkippedPlacementEntry } from 'src/app/domain/models/schedule/skipped-placement.model';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import {
  CELL_DATE_EXPECTATIONS,
  CELL_DATE_LOCALES,
  CELL_DATE_WIRE_VALUE,
} from 'src/app/shared/testing/calendar-date-cell.testing';

describe('SkippedPlacementsReportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkippedPlacementsReportComponent, TranslateModule.forRoot()],
    }).compileComponents();
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(CELL_DATE_LOCALES.map((code) => loader.ensureLoaded(code)));
  });

  function createComponent(entries: SkippedPlacementEntry[]) {
    const fixture = TestBed.createComponent(SkippedPlacementsReportComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return fixture;
  }

  it('renders nothing when entries is empty', () => {
    const fixture = createComponent([]);
    expect(fixture.nativeElement.querySelector('.skipped-placements-report')).toBeNull();
  });

  it('renders a row per entry when entries is not empty', () => {
    const fixture = createComponent([
      { clientId: 'c1', clientName: 'Müller', date: '2026-04-01', shiftId: 's1', shiftName: 'Frühdienst', reasonKey: 'schedule.error-list.overtime' },
    ]);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });

  it('maps a known reasonKey to its short-label key', () => {
    const component = TestBed.createComponent(SkippedPlacementsReportComponent).componentInstance;
    expect(component.reasonLabelKey({ clientId: '', date: '', shiftId: null, reasonKey: 'schedule.error-list.overtime' }))
      .toBe('schedule.compliance.reasonShort.overtime');
  });

  it('falls back to the generic label key for an unknown reasonKey', () => {
    const component = TestBed.createComponent(SkippedPlacementsReportComponent).componentInstance;
    expect(component.reasonLabelKey({ clientId: '', date: '', shiftId: null, reasonKey: 'schedule.error-list.unknown-key' }))
      .toBe('schedule.compliance.reasonShort.other');
  });

  describe('date column', () => {
    function dateCell(locale: string): string {
      TestBed.inject(LocaleService).setLocale(locale);
      const fixture = createComponent([
        { clientId: 'c1', clientName: 'Müller', date: CELL_DATE_WIRE_VALUE, shiftId: 's1', shiftName: 'Frühdienst', reasonKey: 'schedule.error-list.overtime' },
      ]);
      return fixture.nativeElement.querySelector('tbody td').textContent.trim();
    }

    it.each(CELL_DATE_EXPECTATIONS)('shows the date in %s as %s', (locale, expected) => {
      expect(dateCell(locale)).toBe(expected);
    });

    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it('shows the wire day unshifted', () => {
          expect(dateCell('de')).toBe('25.12.2026');
        });
      });
    }
  });
});
