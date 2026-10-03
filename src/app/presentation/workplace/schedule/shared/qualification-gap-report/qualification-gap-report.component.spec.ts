// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleDataLoaderService } from 'src/app/application/services/locale-data-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import {
  QualificationGapDetail,
  QualificationGapKind,
  QualificationGapReason,
  QualificationGapSeverity,
} from 'src/app/domain/models/schedule/qualification-gap.model';
import {
  CELL_DATE_EXPECTATIONS,
  CELL_DATE_LOCALES,
  CELL_DATE_WIRE_VALUE,
} from 'src/app/shared/testing/calendar-date-cell.testing';
import { CALENDAR_TEST_ZONES, useTimeZone } from 'src/app/shared/testing/time-zone.testing';
import { QualificationGapReportComponent } from './qualification-gap-report.component';

const SHIFT_NAME_CELL_INDEX = 1;
const DATE_CELL_INDEX = 2;

const GAP: QualificationGapDetail = {
  kind: QualificationGapKind.UnfillableSlot,
  shiftId: 's1',
  shiftName: 'Fruehdienst',
  date: CELL_DATE_WIRE_VALUE,
  qualificationId: 'q1',
  qualificationName: { de: 'Staplerschein' } as QualificationGapDetail['qualificationName'],
  qualificationEmoji: null,
  reason: QualificationGapReason.Missing,
  requiredMinLevel: 1,
  severity: QualificationGapSeverity.Warning,
};

describe('QualificationGapReportComponent date column', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QualificationGapReportComponent, TranslateModule.forRoot()],
    }).compileComponents();
    const loader = TestBed.inject(LocaleDataLoaderService);
    await Promise.all(CELL_DATE_LOCALES.map((code) => loader.ensureLoaded(code)));
  });

  function cells(locale: string): string[] {
    TestBed.inject(LocaleService).setLocale(locale);
    const fixture = TestBed.createComponent(QualificationGapReportComponent);
    fixture.componentRef.setInput('gaps', [GAP]);
    fixture.detectChanges();
    return Array.from(fixture.nativeElement.querySelectorAll('tbody td')).map((cell) =>
      ((cell as HTMLElement).textContent ?? '').trim(),
    );
  }

  it.each(CELL_DATE_EXPECTATIONS)('shows the date in %s as %s', (locale, expected) => {
    const row = cells(locale);

    expect(row[SHIFT_NAME_CELL_INDEX]).toBe('Fruehdienst');
    expect(row[DATE_CELL_INDEX]).toBe(expected);
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('shows the wire day unshifted', () => {
        expect(cells('de')[DATE_CELL_INDEX]).toBe('25.12.2026');
      });
    });
  }
});
