// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ExportsTabComponent } from './exports-tab.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { PayrollExportBlocker } from 'src/app/infrastructure/api/period-closing/models/payroll-export-blocker';
import { PayrollExportBlockReason } from 'src/app/infrastructure/api/period-closing/models/payroll-export-block-reason';
import { PayrollExportPerson } from 'src/app/infrastructure/api/period-closing/models/payroll-export-person';
import { PayrollExportPreview } from 'src/app/infrastructure/api/period-closing/models/payroll-export-preview';

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
        { provide: ToastShowService, useValue: {} },
        { provide: ModalService, useValue: {} },
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
    ['period-closing-export-employee-form', 'employee'],
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

  it('no longer knows the removed group target', () => {
    component.setTab('single');

    targetRequested$.next({ target: 'period-closing-export-employee-group' });

    expect(component.activeTab()).toBe('single');
  });
});

const PAYROLL_FORMAT = 'datev-lug-bewegungsdaten';

function person(id: string, name: string, isNew: boolean): PayrollExportPerson {
  return { clientId: id, clientName: name, idNumber: 100, isNew, previousRevision: isNew ? null : 1 };
}

function blocker(overrides: Partial<PayrollExportBlocker> = {}): PayrollExportBlocker {
  return {
    clientId: 'c-1',
    clientName: 'Muster, Max',
    idNumber: 7,
    date: '2026-09-03',
    groupId: 'g-1',
    groupName: 'Team A',
    reason: PayrollExportBlockReason.DayNotLocked,
    requiresGlobalClose: false,
    entryCount: 2,
    ...overrides,
  };
}

function preview(overrides: Partial<PayrollExportPreview> = {}): PayrollExportPreview {
  return {
    canExport: true,
    isComplete: true,
    personCount: 3,
    newOrChangedPersons: [person('p-1', 'Anna', true), person('p-2', 'Bruno', false)],
    alreadyExportedCount: 1,
    blockers: [],
    blockerTotal: 0,
    ...overrides,
  };
}

function conflictError(body: unknown): HttpErrorResponse {
  const blob = new Blob([JSON.stringify(body)], { type: 'application/problem+json' });
  return new HttpErrorResponse({ status: 409, error: blob });
}

describe('ExportsTabComponent payroll export', () => {
  let toast: { showSuccess: ReturnType<typeof vi.fn>; showInfo: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let api: {
    getPayrollExportPreview: ReturnType<typeof vi.fn>;
    downloadPayrollExport: ReturnType<typeof vi.fn>;
    downloadClientPeriodExport: ReturnType<typeof vi.fn>;
    seal: ReturnType<typeof vi.fn>;
  };
  let modal: { openModal: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<ExportsTabComponent>;
  let component: ExportsTabComponent;

  beforeEach(async () => {
    toast = { showSuccess: vi.fn(), showInfo: vi.fn(), showError: vi.fn() };
    api = {
      getPayrollExportPreview: vi.fn().mockReturnValue(of(preview())),
      downloadPayrollExport: vi.fn(),
      downloadClientPeriodExport: vi.fn(),
      seal: vi.fn().mockReturnValue(of(5)),
    };
    modal = { openModal: vi.fn() };
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:payroll');
    window.URL.revokeObjectURL = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ExportsTabComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataPeriodClosingService, useValue: api },
        {
          provide: DataExportFormatsService,
          useValue: {
            getFormats: vi.fn().mockReturnValue(of([
              { key: PAYROLL_FORMAT, enabled: true, fixed: false, family: 'payroll' },
              { key: 'xml', enabled: true, fixed: true, family: 'generic' },
            ])),
          },
        },
        { provide: ToastShowService, useValue: toast },
        { provide: ModalService, useValue: modal },
        {
          provide: EVENT_BUS_TOKEN,
          useValue: { emit: vi.fn(), on: vi.fn().mockReturnValue(new Subject().asObservable()), onAny: vi.fn() },
        },
      ],
    })
      .overrideComponent(ExportsTabComponent, {
        set: { imports: [CommonModule, FormsModule, TranslateModule], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ExportsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.setTab('employee');
    component.setClientExportFormat(PAYROLL_FORMAT as never);
    fixture.detectChanges();
  });

  function respondWith(headers: Record<string, string>): void {
    api.downloadPayrollExport.mockReturnValue(
      of(new HttpResponse<Blob>({ body: new Blob(['x']), headers: new HttpHeaders(headers) })),
    );
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  function query<T extends HTMLElement>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  describe('form', () => {
    it('has no group dropdown for a payroll format', () => {
      expect(component.isPayrollFormat()).toBe(true);
      expect(query('#clientExportGroup')).toBeNull();
    });

    it('enables the export button without any group selection', () => {
      const button = query<HTMLButtonElement>('[data-klacksy-target="period-closing-export-employee-export"] button');

      expect(button?.disabled).toBe(false);
    });
  });

  describe('preview before download', () => {
    it('asks for the preview and does not download on the first click', () => {
      component.onClientPeriodExport();

      expect(api.getPayrollExportPreview).toHaveBeenCalledTimes(1);
      const [from, until, format] = api.getPayrollExportPreview.mock.calls[0];
      expect(from <= until).toBe(true);
      expect(format).toBe(PAYROLL_FORMAT);
      expect(api.downloadPayrollExport).not.toHaveBeenCalled();
    });

    it('lists the new and changed persons with everyone selected', () => {
      component.onClientPeriodExport();
      fixture.detectChanges();

      expect(query('#payroll-summary')).not.toBeNull();
      expect(query('#payroll-blockers')).toBeNull();
      expect(component.newPersonCount()).toBe(1);
      expect(component.changedPersonCount()).toBe(1);
      expect(component.selectedPersonCount()).toBe(2);
      expect(fixture.nativeElement.querySelectorAll('#payroll-persons-table tbody tr').length).toBe(2);
      expect(query('#payroll-supplementary-note')).not.toBeNull();
    });

    it('shows the nothing-new note and no export button when everything was exported unchanged', () => {
      api.getPayrollExportPreview.mockReturnValue(
        of(preview({ canExport: false, newOrChangedPersons: [], alreadyExportedCount: 3 })),
      );

      component.onClientPeriodExport();
      fixture.detectChanges();

      expect(query('#payroll-nothing-new')).not.toBeNull();
      expect(query('#payroll-confirm-export')).toBeNull();
    });

    it('shows the no-data note when the period holds no closed payroll data', () => {
      api.getPayrollExportPreview.mockReturnValue(
        of(preview({ canExport: false, personCount: 0, newOrChangedPersons: [], alreadyExportedCount: 0 })),
      );

      component.onClientPeriodExport();
      fixture.detectChanges();

      expect(query('#payroll-no-data')).not.toBeNull();
    });

    it('drops a stale preview when the format changes', () => {
      component.onClientPeriodExport();
      expect(component.payrollPreview()).not.toBeNull();

      component.setClientExportFormat('xml');

      expect(component.payrollPreview()).toBeNull();
      expect(component.selectedPersonCount()).toBe(0);
    });
  });

  describe('blockers', () => {
    const blockedPreview = (): PayrollExportPreview => preview({
      canExport: false,
      isComplete: false,
      blockers: [
        blocker(),
        blocker({ clientName: 'Beispiel, Eva', groupId: null, groupName: null, requiresGlobalClose: true, date: null, reason: PayrollExportBlockReason.OverlappingExport }),
      ],
      blockerTotal: 2,
    });

    it('renders the blocker table and keeps the export disabled', () => {
      api.getPayrollExportPreview.mockReturnValue(of(blockedPreview()));

      component.onClientPeriodExport();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('#payroll-blockers-table tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Muster, Max');
      expect(rows[0].textContent).toContain('Team A');
      expect(rows[0].textContent).toContain('periodClosing.payroll.reason.dayNotLocked');
      expect(query('#payroll-confirm-export')).toBeNull();
      expect(component.canConfirmPayrollExport()).toBe(false);
      expect(query('#payroll-blockers-truncated')).toBeNull();
    });

    it('marks blockers that only a global close can resolve and offers the global close', () => {
      api.getPayrollExportPreview.mockReturnValue(of(blockedPreview()));

      component.onClientPeriodExport();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('#payroll-blockers-table tbody tr');
      expect(rows[0].textContent).not.toContain('periodClosing.payroll.globalCloseOnly');
      expect(rows[1].textContent).toContain('periodClosing.payroll.globalCloseOnly');
      expect(query('#payroll-global-close')).not.toBeNull();
    });

    it('offers no global close when every blocker can be resolved by a group close', () => {
      api.getPayrollExportPreview.mockReturnValue(
        of(preview({ canExport: false, isComplete: false, blockers: [blocker()], blockerTotal: 1 })),
      );

      component.onClientPeriodExport();
      fixture.detectChanges();

      expect(query('#payroll-global-close')).toBeNull();
    });

    it('notes that more blockers exist than are shown', () => {
      api.getPayrollExportPreview.mockReturnValue(
        of(preview({ canExport: false, isComplete: false, blockers: [blocker()], blockerTotal: 501 })),
      );

      component.onClientPeriodExport();
      fixture.detectChanges();

      expect(query('#payroll-blockers-truncated')).not.toBeNull();
    });

    it('asks for confirmation before sealing globally and seals without a group', () => {
      api.getPayrollExportPreview.mockReturnValue(of(blockedPreview()));
      component.onClientPeriodExport();
      fixture.detectChanges();

      component.onGlobalCloseRequested();

      expect(modal.openModal).toHaveBeenCalledTimes(1);
      expect(api.seal).not.toHaveBeenCalled();

      modal.openModal.mock.calls[0][0].onConfirm();

      expect(api.seal).toHaveBeenCalledTimes(1);
      const request = api.seal.mock.calls[0][0];
      expect(request.groupId).toBeNull();
      expect(request.acknowledgeViolations).toBe(false);
      expect(toast.showSuccess).toHaveBeenCalled();
      expect(api.getPayrollExportPreview).toHaveBeenCalledTimes(2);
    });

    it('re-offers the global close for confirmation when the seal is refused over open errors', () => {
      api.getPayrollExportPreview.mockReturnValue(of(blockedPreview()));
      api.seal.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: { currentErrorCount: 4 } })));
      component.onClientPeriodExport();

      component.onGlobalCloseRequested();
      modal.openModal.mock.calls[0][0].onConfirm();

      expect(modal.openModal).toHaveBeenCalledTimes(2);
      expect(toast.showError).not.toHaveBeenCalled();

      modal.openModal.mock.calls[1][0].onConfirm();

      const retry = api.seal.mock.calls[1][0];
      expect(retry.acknowledgeViolations).toBe(true);
      expect(retry.acknowledgedErrorCount).toBe(4);
    });
  });

  describe('download', () => {
    beforeEach(() => {
      component.onClientPeriodExport();
      fixture.detectChanges();
    });

    it('exports every new or changed person without a person selection', () => {
      respondWith({ 'X-Klacks-Export-Persons': '2' });

      component.onPayrollExportConfirmed();

      expect(api.downloadPayrollExport).toHaveBeenCalledTimes(1);
      const request = api.downloadPayrollExport.mock.calls[0][0];
      expect(request.format).toBe(PAYROLL_FORMAT);
      expect('groupId' in request).toBe(false);
      expect(request.clientIds).toBeUndefined();
      expect(toast.showSuccess.mock.calls[0][0]).toBe('periodClosing.payroll.exportedPersons');
      expect(component.payrollPreview()).toBeNull();
    });

    it('sends the selected person ids for a supplementary export of a subset', () => {
      respondWith({ 'X-Klacks-Export-Persons': '1', 'X-Klacks-Export-Supplementary': 'True' });
      component.togglePerson(component.payrollPersons()[0]);

      component.onPayrollExportConfirmed();

      expect(api.downloadPayrollExport.mock.calls[0][0].clientIds).toEqual(['p-2']);
      expect(toast.showSuccess.mock.calls[0][0]).toBe('periodClosing.payroll.exportedSupplementary');
    });

    it('does not export when no person is selected', () => {
      component.toggleAllPersons();

      component.onPayrollExportConfirmed();

      expect(component.canConfirmPayrollExport()).toBe(false);
      expect(api.downloadPayrollExport).not.toHaveBeenCalled();
    });

    it('selects all persons again through the select-all toggle', () => {
      component.toggleAllPersons();
      expect(component.selectedPersonCount()).toBe(0);

      component.toggleAllPersons();

      expect(component.allPersonsSelected()).toBe(true);
    });

    it('shows an info toast with the skipped count when entries could not be exported', () => {
      respondWith({ 'X-Klacks-Export-Skipped': '3' });

      component.onPayrollExportConfirmed();

      expect(toast.showSuccess).toHaveBeenCalled();
      expect(toast.showInfo).toHaveBeenCalledWith('periodClosing.clientExport.skippedEntries');
    });

    it('shows an info toast when the absence mapping is invalid', () => {
      respondWith({ 'X-Klacks-Export-Skipped': '0', 'X-Klacks-Export-Mapping-Invalid': 'True' });

      component.onPayrollExportConfirmed();

      expect(toast.showInfo).toHaveBeenCalledWith('periodClosing.clientExport.mappingInvalid');
    });

    it('shows no info toast when every entry was exported', () => {
      respondWith({ 'X-Klacks-Export-Skipped': '0' });

      component.onPayrollExportConfirmed();

      expect(toast.showInfo).not.toHaveBeenCalled();
    });
  });

  describe('409 handling', () => {
    beforeEach(() => {
      component.onClientPeriodExport();
      fixture.detectChanges();
    });

    it('renders the blockers from a payrollExportBlocked body', async () => {
      api.downloadPayrollExport.mockReturnValue(throwError(() => conflictError({
        errorCode: 'payrollExportBlocked',
        blockers: [blocker({ requiresGlobalClose: true })],
        blockerTotal: 9,
      })));

      component.onPayrollExportConfirmed();
      await settle();

      expect(component.payrollBlockers().length).toBe(1);
      expect(component.payrollBlockerTotal()).toBe(9);
      expect(component.payrollPreview()).toBeNull();
      expect(component.blockersTruncated()).toBe(true);
      expect(query('#payroll-global-close')).not.toBeNull();
      expect(toast.showError).toHaveBeenCalledWith('periodClosing.payroll.error.blocked');
      expect(component.clientExportBusy()).toBe(false);
    });

    it('tells that nothing is new and reloads the preview', async () => {
      api.downloadPayrollExport.mockReturnValue(throwError(() => conflictError({ errorCode: 'payrollExportNothingNew' })));
      api.getPayrollExportPreview.mockClear();

      component.onPayrollExportConfirmed();
      await settle();

      expect(toast.showInfo).toHaveBeenCalledWith('periodClosing.payroll.error.nothingNew');
      expect(api.getPayrollExportPreview).toHaveBeenCalledTimes(1);
    });

    it('tells that another export is running and drops the preview', async () => {
      api.downloadPayrollExport.mockReturnValue(throwError(() => conflictError({ errorCode: 'payrollExportConcurrent' })));

      component.onPayrollExportConfirmed();
      await settle();

      expect(toast.showError).toHaveBeenCalledWith('periodClosing.payroll.error.concurrent');
      expect(component.payrollPreview()).toBeNull();
    });

    it('shows the generic error for a failure that is not a payroll conflict', async () => {
      api.downloadPayrollExport.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500, error: { message: 'boom' } })),
      );

      component.onPayrollExportConfirmed();
      await settle();

      expect(toast.showError).toHaveBeenCalledWith('boom');
      expect(component.clientExportBusy()).toBe(false);
    });
  });

  describe('generic formats', () => {
    it('keeps the direct download for a non-payroll format', () => {
      component.setClientExportFormat('xml');
      api.downloadClientPeriodExport.mockReturnValue(
        of(new HttpResponse<Blob>({ body: new Blob(['x']), headers: new HttpHeaders() })),
      );

      component.onClientPeriodExport();

      expect(api.downloadClientPeriodExport).toHaveBeenCalledTimes(1);
      expect(api.getPayrollExportPreview).not.toHaveBeenCalled();
    });
  });
});
