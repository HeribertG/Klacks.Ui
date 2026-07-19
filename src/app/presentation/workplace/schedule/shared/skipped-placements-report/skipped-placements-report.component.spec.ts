// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SkippedPlacementsReportComponent } from './skipped-placements-report.component';
import { SkippedPlacementEntry } from 'src/app/domain/models/schedule/skipped-placement.model';

describe('SkippedPlacementsReportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkippedPlacementsReportComponent, TranslateModule.forRoot()],
    }).compileComponents();
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
});
