// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { PeriodsTabComponent } from './periods-tab.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/schedule/data-shift-schedule.service';
import { ExportLog } from 'src/app/infrastructure/api/period-closing/models/export-log';
import { SealedPeriodSummary } from 'src/app/infrastructure/api/period-closing/models/sealed-period-summary';
import { UsedPeriod } from 'src/app/infrastructure/api/period-closing/models/used-period';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const PERIOD: UsedPeriod = {
  startDate: '2026-05-01',
  endDate: '2026-05-07',
  paymentInterval: 0,
  groupId: null,
  groupName: null,
};

const SEALED_DAY: SealedPeriodSummary = {
  date: '2026-05-02',
  totalWorkCount: 3,
  sealedWorkCount: 3,
  totalBreakCount: 1,
  sealedBreakCount: 1,
  isFullySealed: true,
  isDaySealed: true,
};

const UNSEALED_DAY: SealedPeriodSummary = {
  date: '2026-05-03',
  totalWorkCount: 2,
  sealedWorkCount: 0,
  totalBreakCount: 0,
  sealedBreakCount: 0,
  isFullySealed: false,
  isDaySealed: false,
};

const EXPORT_LOG: ExportLog = {
  id: 'export-1',
  format: 'csv',
  startDate: '2026-05-01',
  endDate: '2026-05-07',
  groupId: null,
  groupName: null,
  language: 'de',
  currencyCode: 'CHF',
  fileName: 'export.csv',
  fileSize: 100,
  recordCount: 4,
  exportedAt: '2026-05-08T10:00:00Z',
  exportedBy: 'user-1',
  exportedByName: 'Test User',
};

const GROUP_PERIOD: UsedPeriod = {
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  paymentInterval: 1,
  groupId: 'group-bern',
  groupName: 'Bern',
};

const NEWER_GROUP_PERIOD: UsedPeriod = {
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  paymentInterval: 1,
  groupId: 'group-bern',
  groupName: 'Bern',
};

describe('PeriodsTabComponent', () => {
  let queryParams: Record<string, string>;
  let queryParamMap$: BehaviorSubject<unknown>;
  let fixture: ComponentFixture<PeriodsTabComponent>;
  let component: PeriodsTabComponent;
  let api: {
    getUsedPeriods: ReturnType<typeof vi.fn>;
    getSealedPeriods: ReturnType<typeof vi.fn>;
    getPeriodIssues: ReturnType<typeof vi.fn>;
    getExportLog: ReturnType<typeof vi.fn>;
    seal: ReturnType<typeof vi.fn>;
    unseal: ReturnType<typeof vi.fn>;
  };
  let modalService: { openModal: ReturnType<typeof vi.fn> };
  let toastShowService: {
    showInfo: ReturnType<typeof vi.fn>;
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
  };

  function lastModalOptions(): { message: string; onConfirm: () => void } {
    const calls = modalService.openModal.mock.calls;
    return calls[calls.length - 1][0];
  }

  beforeEach(() => {
    queryParams = {};
    queryParamMap$ = new BehaviorSubject<unknown>({ get: (key: string) => queryParams[key] ?? null });
    api = {
      getUsedPeriods: vi.fn().mockReturnValue(of([PERIOD])),
      getSealedPeriods: vi.fn().mockReturnValue(of([SEALED_DAY, UNSEALED_DAY])),
      getPeriodIssues: vi.fn().mockReturnValue(of([])),
      getExportLog: vi.fn().mockReturnValue(of([])),
      seal: vi.fn().mockReturnValue(of(1)),
      unseal: vi.fn().mockReturnValue(of(1)),
    };
    modalService = { openModal: vi.fn() };
    toastShowService = {
      showInfo: vi.fn(),
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };
    const shiftScheduleApi = {
      getShiftSchedule: vi.fn().mockReturnValue(of({ shifts: [], totalCount: 0 })),
    };

    TestBed.configureTestingModule({
      imports: [PeriodsTabComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataPeriodClosingService, useValue: api },
        { provide: DataShiftScheduleService, useValue: shiftScheduleApi },
        { provide: ModalService, useValue: modalService },
        { provide: ToastShowService, useValue: toastShowService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: (key: string) => queryParams[key] ?? null } },
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(PeriodsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('bulk seal', () => {
    it('opens a confirmation dialog and seals only after confirm', () => {
      component.onBulkSeal();

      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(api.seal).not.toHaveBeenCalled();

      lastModalOptions().onConfirm();

      expect(api.seal).toHaveBeenCalledWith({
        startDate: PERIOD.startDate,
        endDate: PERIOD.endDate,
        groupId: null,
        reason: null,
        acknowledgeViolations: false,
        acknowledgedErrorCount: null,
      });
    });

    it('does not seal when the dialog is cancelled', () => {
      component.onBulkSeal();

      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(api.seal).not.toHaveBeenCalled();
    });
  });

  describe('violation re-confirmation', () => {
    function conflict(currentErrorCount?: number) {
      return throwError(() => ({ status: 409, error: currentErrorCount === undefined ? {} : { currentErrorCount } }));
    }

    it('confirms the exact error count the backend reported', () => {
      api.seal.mockReturnValueOnce(conflict(3));

      component.onBulkSeal();
      lastModalOptions().onConfirm();
      lastModalOptions().onConfirm();

      expect(api.seal).toHaveBeenLastCalledWith(
        expect.objectContaining({ acknowledgeViolations: true, acknowledgedErrorCount: 3 })
      );
    });

    it('asks again with the new count when errors appeared after the confirmation', () => {
      api.seal.mockReturnValueOnce(conflict(3)).mockReturnValueOnce(conflict(5));

      component.onBulkSeal();
      lastModalOptions().onConfirm();
      lastModalOptions().onConfirm();
      lastModalOptions().onConfirm();

      expect(api.seal).toHaveBeenLastCalledWith(
        expect.objectContaining({ acknowledgeViolations: true, acknowledgedErrorCount: 5 })
      );
      expect(toastShowService.showError).not.toHaveBeenCalled();
    });

    it('stops retrying when the refusal repeats the very count that was confirmed', () => {
      api.seal.mockReturnValue(conflict(3));

      component.onBulkSeal();
      lastModalOptions().onConfirm();
      lastModalOptions().onConfirm();

      expect(api.seal).toHaveBeenCalledTimes(2);
      expect(toastShowService.showError).toHaveBeenCalled();
    });

    it('confirms the legacy way when the refusal carries no count', () => {
      api.seal.mockReturnValueOnce(conflict());

      component.onBulkSeal();
      lastModalOptions().onConfirm();
      lastModalOptions().onConfirm();

      expect(api.seal).toHaveBeenLastCalledWith(
        expect.objectContaining({ acknowledgeViolations: true, acknowledgedErrorCount: null })
      );
    });

    it('re-confirms a single day seal with the reported count', () => {
      api.seal.mockReturnValueOnce(conflict(2));
      const event = { target: { checked: true } } as unknown as Event;

      component.onDaySealToggle(UNSEALED_DAY, event);
      lastModalOptions().onConfirm();
      lastModalOptions().onConfirm();

      expect(api.seal).toHaveBeenLastCalledWith(
        expect.objectContaining({
          startDate: UNSEALED_DAY.date,
          acknowledgeViolations: true,
          acknowledgedErrorCount: 2,
        })
      );
    });
  });

  describe('day seal toggle', () => {
    it('seals a day only after confirm', () => {
      const event = { target: { checked: true } } as unknown as Event;
      component.onDaySealToggle(UNSEALED_DAY, event);

      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(api.seal).not.toHaveBeenCalled();

      lastModalOptions().onConfirm();

      expect(api.seal).toHaveBeenCalledWith({
        startDate: UNSEALED_DAY.date,
        endDate: UNSEALED_DAY.date,
        groupId: null,
        reason: null,
        acknowledgeViolations: false,
        acknowledgedErrorCount: null,
      });
    });

    it('does not seal a day when the dialog is cancelled', () => {
      const event = { target: { checked: true } } as unknown as Event;
      component.onDaySealToggle(UNSEALED_DAY, event);

      expect(api.seal).not.toHaveBeenCalled();
    });

    it('opens the reason dialog instead of unsealing directly for a sealed day', () => {
      const event = { target: { checked: false } } as unknown as Event;
      component.onDaySealToggle(SEALED_DAY, event);

      expect(component.unsealReasonDay()).toBe(SEALED_DAY.date);
      expect(modalService.openModal).not.toHaveBeenCalled();
      expect(api.unseal).not.toHaveBeenCalled();
    });
  });

  describe('day unseal', () => {
    it('unseals only after confirm', () => {
      component.unsealReasonDay.set(SEALED_DAY.date);
      component.unsealReasonText.set('correction needed');

      component.confirmUnsealDay();

      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(api.unseal).not.toHaveBeenCalled();

      lastModalOptions().onConfirm();

      expect(api.unseal).toHaveBeenCalledWith({
        startDate: SEALED_DAY.date,
        endDate: SEALED_DAY.date,
        groupId: null,
        reason: 'correction needed',
      });
      expect(component.unsealReasonDay()).toBeNull();
    });

    it('does not unseal when the dialog is cancelled', () => {
      component.unsealReasonDay.set(SEALED_DAY.date);
      component.unsealReasonText.set('correction needed');

      component.confirmUnsealDay();

      expect(api.unseal).not.toHaveBeenCalled();
    });

    it('requires a reason before opening the confirmation dialog', () => {
      component.unsealReasonDay.set(SEALED_DAY.date);
      component.unsealReasonText.set('');

      component.confirmUnsealDay();

      expect(toastShowService.showInfo).toHaveBeenCalled();
      expect(modalService.openModal).not.toHaveBeenCalled();
      expect(api.unseal).not.toHaveBeenCalled();
    });
  });

  describe('bulk unseal', () => {
    it('unseals only after confirm', () => {
      component.onBulkUnseal();
      component.unsealReasonText.set('payroll fix');

      component.confirmBulkUnseal();

      expect(modalService.openModal).toHaveBeenCalledTimes(1);
      expect(api.unseal).not.toHaveBeenCalled();

      lastModalOptions().onConfirm();

      expect(api.unseal).toHaveBeenCalledWith({
        startDate: PERIOD.startDate,
        endDate: PERIOD.endDate,
        groupId: null,
        reason: 'payroll fix',
      });
    });

    it('does not unseal when the dialog is cancelled', () => {
      component.onBulkUnseal();
      component.unsealReasonText.set('payroll fix');

      component.confirmBulkUnseal();

      expect(api.unseal).not.toHaveBeenCalled();
    });
  });

  describe('export warning', () => {
    it('appends the hasExport warning to the unseal message when an export exists', () => {
      component.exportLogs.set([EXPORT_LOG]);
      component.onBulkUnseal();
      component.unsealReasonText.set('payroll fix');

      component.confirmBulkUnseal();

      expect(lastModalOptions().message).toContain('periodClosing.warning.hasExport');
    });

    it('omits the hasExport warning when no export exists', () => {
      component.exportLogs.set([]);
      component.onBulkUnseal();
      component.unsealReasonText.set('payroll fix');

      component.confirmBulkUnseal();

      expect(lastModalOptions().message).not.toContain('periodClosing.warning.hasExport');
    });

    it('omits the hasExport warning for a day outside the exported range', () => {
      component.exportLogs.set([{ ...EXPORT_LOG, startDate: '2026-05-01', endDate: '2026-05-01' }]);
      component.unsealReasonDay.set(SEALED_DAY.date);
      component.unsealReasonText.set('correction needed');

      component.confirmUnsealDay();

      expect(lastModalOptions().message).not.toContain('periodClosing.warning.hasExport');
    });

    it('loads the export log together with the period summary', () => {
      expect(api.getExportLog).toHaveBeenCalledWith(PERIOD.startDate, PERIOD.endDate);
    });
  });

  describe('one-click action preselection', () => {
    function recreate(): PeriodsTabComponent {
      const created = TestBed.createComponent(PeriodsTabComponent);
      created.detectChanges();
      return created.componentInstance;
    }

    it('opens the period of the reported group that covers the reported date', () => {
      queryParams = { groupId: 'group-bern', date: '2026-07-31' };
      api.getUsedPeriods.mockReturnValue(of([NEWER_GROUP_PERIOD, GROUP_PERIOD, PERIOD]));

      const created = recreate();

      expect(created.selectedPeriod()).toEqual(GROUP_PERIOD);
    });

    it('falls back to the newest period when the group has none', () => {
      queryParams = { groupId: 'group-unknown', date: '2026-07-31' };
      api.getUsedPeriods.mockReturnValue(of([NEWER_GROUP_PERIOD, PERIOD]));

      const created = recreate();

      expect(created.selectedPeriod()).toEqual(NEWER_GROUP_PERIOD);
    });

    it('keeps the newest period without query params', () => {
      api.getUsedPeriods.mockReturnValue(of([NEWER_GROUP_PERIOD, GROUP_PERIOD]));

      const created = recreate();

      expect(created.selectedPeriod()).toEqual(NEWER_GROUP_PERIOD);
    });

    it('switches to the group of a second reminder without a reload', () => {
      queryParams = { groupId: 'group-bern', date: '2026-07-31' };
      api.getUsedPeriods.mockReturnValue(of([NEWER_GROUP_PERIOD, GROUP_PERIOD, PERIOD]));
      const created = recreate();
      expect(created.selectedPeriod()).toEqual(GROUP_PERIOD);

      queryParams = { groupId: 'group-bern', date: '2026-08-15' };
      queryParamMap$.next({ get: (key: string) => queryParams[key] ?? null });

      expect(created.selectedPeriod()).toEqual(NEWER_GROUP_PERIOD);
    });
  });
});
