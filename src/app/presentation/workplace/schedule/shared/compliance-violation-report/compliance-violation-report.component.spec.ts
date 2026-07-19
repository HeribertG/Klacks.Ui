// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ComplianceViolationReportComponent } from './compliance-violation-report.component';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';

describe('ComplianceViolationReportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceViolationReportComponent, TranslateModule.forRoot()],
    }).compileComponents();
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
});
