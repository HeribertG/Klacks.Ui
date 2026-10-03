// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ComplianceViolationReportComponent } from './compliance-violation-report.component';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import {
  CELL_DATE_EXPECTATIONS,
  CELL_DATE_LOCALES,
  CELL_DATE_WIRE_VALUE,
} from 'src/app/shared/testing/calendar-date-cell.testing';

describe('ComplianceViolationReportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceViolationReportComponent, TranslateModule.forRoot()],
    }).compileComponents();
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(CELL_DATE_LOCALES.map((code) => loader.ensureLoaded(code)));
  });

  function createComponent(entries: ScheduleErrorEntry[]) {
    const fixture = TestBed.createComponent(ComplianceViolationReportComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return fixture;
  }

  it('renders nothing when entries is empty', () => {
    const fixture = createComponent([]);
    expect(fixture.nativeElement.querySelector('.compliance-violation-report')).toBeNull();
  });

  it('renders a row per entry when entries is not empty', () => {
    const fixture = createComponent([
      { type: 'error', clientId: 'c1', clientName: 'Müller', date: '2026-04-01', comment: 'schedule.error-list.overtime', commentParams: { actualHours: '10', maxHours: '9' } },
      { type: 'warning', clientId: 'c2', clientName: 'Meier', date: '2026-04-02', comment: 'schedule.error-list.min-rest-days' },
    ]);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('marks error rows with table-danger and warning rows with table-warning', () => {
    const component = TestBed.createComponent(ComplianceViolationReportComponent).componentInstance;
    expect(component.rowClass({ type: 'error', clientId: '', clientName: '', date: '', comment: '' })).toBe('table-danger');
    expect(component.rowClass({ type: 'warning', clientId: '', clientName: '', date: '', comment: '' })).toBe('table-warning');
  });

  describe('date column', () => {
    function dateCell(locale: string, date = CELL_DATE_WIRE_VALUE): string {
      TestBed.inject(LocaleService).setLocale(locale);
      const fixture = createComponent([
        { type: 'error', clientId: 'c1', clientName: 'Müller', date, comment: 'schedule.error-list.overtime' },
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
