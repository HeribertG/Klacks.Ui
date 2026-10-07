// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ExportsTabComponent } from './exports-tab.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';

describe('ExportsTabComponent klacksy targets', () => {
  let targetRequested$: Subject<{ target: string }>;
  let component: ExportsTabComponent;

  beforeEach(async () => {
    targetRequested$ = new Subject<{ target: string }>();

    await TestBed.configureTestingModule({
      imports: [ExportsTabComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataPeriodClosingService, useValue: {} },
        { provide: DataExportFormatsService, useValue: { getFormats: vi.fn().mockReturnValue(of([])) } },
        { provide: DataGroupService, useValue: { readGroupList: vi.fn().mockReturnValue(of({ groups: [] })) } },
        { provide: ToastShowService, useValue: {} },
        {
          provide: EVENT_BUS_TOKEN,
          useValue: { emit: vi.fn(), on: vi.fn().mockReturnValue(targetRequested$.asObservable()), onAny: vi.fn() },
        },
      ],
    })
      .overrideComponent(ExportsTabComponent, { set: { imports: [], template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(ExportsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts on the single order tab', () => {
    expect(component.activeTab()).toBe('single');
  });

  it.each([
    ['period-closing-export-tab-employee', 'employee'],
    ['period-closing-export-employee-group', 'employee'],
    ['period-closing-export-range-form', 'range'],
    ['period-closing-export-range-export', 'range'],
    ['period-closing-export-tab-range', 'range'],
    ['period-closing-export-single-order', 'single'],
  ])('switches to the tab that holds %s', (target, tab) => {
    component.setTab(tab === 'single' ? 'range' : 'single');

    targetRequested$.next({ target });

    expect(component.activeTab()).toBe(tab);
  });

  it('keeps the active tab for targets outside the export tabs', () => {
    component.setTab('employee');

    targetRequested$.next({ target: 'period-closing-audit-filter' });
    targetRequested$.next({ target: 'period-closing-exports' });

    expect(component.activeTab()).toBe('employee');
  });
});

describe('ExportsTabComponent payroll download report', () => {
  const payrollFormat = 'datev-lug-bewegungsdaten';
  let toast: { showSuccess: ReturnType<typeof vi.fn>; showInfo: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let downloadPayrollExport: ReturnType<typeof vi.fn>;
  let component: ExportsTabComponent;

  beforeEach(async () => {
    toast = { showSuccess: vi.fn(), showInfo: vi.fn(), showError: vi.fn() };
    downloadPayrollExport = vi.fn();
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:payroll');
    window.URL.revokeObjectURL = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ExportsTabComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataPeriodClosingService, useValue: { downloadPayrollExport } },
        {
          provide: DataExportFormatsService,
          useValue: {
            getFormats: vi.fn().mockReturnValue(of([{ key: payrollFormat, enabled: true, fixed: false, family: 'payroll' }])),
          },
        },
        { provide: DataGroupService, useValue: { readGroupList: vi.fn().mockReturnValue(of({ groups: [] })) } },
        { provide: ToastShowService, useValue: toast },
        {
          provide: EVENT_BUS_TOKEN,
          useValue: { emit: vi.fn(), on: vi.fn().mockReturnValue(new Subject().asObservable()), onAny: vi.fn() },
        },
      ],
    })
      .overrideComponent(ExportsTabComponent, { set: { imports: [], template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(ExportsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.clientExportFormat.set(payrollFormat as never);
    component.selectedGroupId.set('group-1');
  });

  function respondWith(headers: Record<string, string>): void {
    downloadPayrollExport.mockReturnValue(
      of(new HttpResponse<Blob>({ body: new Blob(['x']), headers: new HttpHeaders(headers) })),
    );
  }

  it('shows an info toast with the skipped count when entries could not be exported', () => {
    respondWith({ 'X-Klacks-Export-Skipped': '3' });

    component.onClientPeriodExport();

    expect(toast.showSuccess).toHaveBeenCalled();
    expect(toast.showInfo).toHaveBeenCalledWith('periodClosing.clientExport.skippedEntries');
  });

  it('shows an info toast when the absence mapping is invalid', () => {
    respondWith({ 'X-Klacks-Export-Skipped': '0', 'X-Klacks-Export-Mapping-Invalid': 'True' });

    component.onClientPeriodExport();

    expect(toast.showInfo).toHaveBeenCalledWith('periodClosing.clientExport.mappingInvalid');
  });

  it('shows no info toast when every entry was exported', () => {
    respondWith({ 'X-Klacks-Export-Skipped': '0' });

    component.onClientPeriodExport();

    expect(toast.showInfo).not.toHaveBeenCalled();
  });
});
