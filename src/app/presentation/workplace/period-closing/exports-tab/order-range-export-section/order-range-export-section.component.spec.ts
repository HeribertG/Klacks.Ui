// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { OrderRangeExportSectionComponent } from './order-range-export-section.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { ISealedOrderDetails } from 'src/app/infrastructure/api/period-closing/models/sealed-order-details';
import { ISealedOrderWorkEntry } from 'src/app/infrastructure/api/period-closing/models/sealed-order-work-entry';
import { SealedOrderListItem } from 'src/app/infrastructure/api/period-closing/models/sealed-order-list-item';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const ORDER: SealedOrderListItem = {
  id: 'order-1',
  abbreviation: 'A1',
  name: 'Order One',
  fromDate: '2026-06-01',
  untilDate: '2026-06-30',
  sourceSystemId: 'sys-1',
  externalOrderReference: 'ERP-42',
  customerId: null,
  customerNumber: null,
  customerName: 'Acme',
  totalWorks: 4,
  closedWorks: 3,
};

const CLOSED_ENTRY: ISealedOrderWorkEntry = {
  workId: 'work-1',
  employeeId: 'employee-1',
  employeeName: 'Doe, Jane',
  employeeIdNumber: 7,
  workDate: '2026-06-02',
  startTime: '08:00',
  endTime: '16:00',
  hours: 8,
  surcharges: 0,
  lockLevel: 3,
  periodClosed: true,
};

const SEALED_OPEN_ENTRY: ISealedOrderWorkEntry = {
  ...CLOSED_ENTRY,
  workId: 'work-2',
  periodClosed: false,
};

const UNSEALED_ENTRY: ISealedOrderWorkEntry = {
  ...CLOSED_ENTRY,
  workId: 'work-3',
  lockLevel: 1,
  periodClosed: false,
};

const DETAILS: ISealedOrderDetails = {
  id: ORDER.id,
  name: ORDER.name,
  abbreviation: ORDER.abbreviation,
  sourceSystemId: ORDER.sourceSystemId,
  externalOrderReference: ORDER.externalOrderReference,
  customerId: null,
  customerNumber: null,
  customerName: ORDER.customerName,
  customerExternalReference: null,
  workEntries: [CLOSED_ENTRY, SEALED_OPEN_ENTRY, UNSEALED_ENTRY],
};

describe('OrderRangeExportSectionComponent', () => {
  let fixture: ComponentFixture<OrderRangeExportSectionComponent>;
  let component: OrderRangeExportSectionComponent;
  let api: {
    listSealedOrders: ReturnType<typeof vi.fn>;
    getSealedOrderDetails: ReturnType<typeof vi.fn>;
    downloadOrderRangeExport: ReturnType<typeof vi.fn>;
  };
  let toastShowService: {
    showInfo: ReturnType<typeof vi.fn>;
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      listSealedOrders: vi.fn().mockReturnValue(of([ORDER])),
      getSealedOrderDetails: vi.fn().mockReturnValue(of(DETAILS)),
      downloadOrderRangeExport: vi.fn().mockReturnValue(
        of(
          new HttpResponse({
            body: new Blob(['zip']),
            headers: new HttpHeaders({
              'content-disposition': 'attachment; filename="erp-order-export.zip"',
            }),
          }),
        ),
      ),
    };
    toastShowService = {
      showInfo: vi.fn(),
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    window.URL.revokeObjectURL = vi.fn();

    TestBed.configureTestingModule({
      imports: [OrderRangeExportSectionComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataPeriodClosingService, useValue: api },
        { provide: ToastShowService, useValue: toastShowService },
      ],
    });
    fixture = TestBed.createComponent(OrderRangeExportSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('order preview', () => {
    it('loads sealed orders for the default range on init', () => {
      expect(api.listSealedOrders).toHaveBeenCalledTimes(1);
      const [from, until, groupId, search] = api.listSealedOrders.mock.calls[0];
      expect(from).toMatch(/^\d{4}-\d{2}-01$/);
      expect(until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(groupId).toBeNull();
      expect(search).toBeNull();
      expect(component.orders()).toEqual([ORDER]);
    });

    it('rejects an invalid range without calling the API again', () => {
      component.rangeFrom.set({ year: 2026, month: 7, day: 10 });
      component.rangeUntil.set({ year: 2026, month: 6, day: 1 });

      component.reloadOrders();

      expect(api.listSealedOrders).toHaveBeenCalledTimes(1);
      expect(toastShowService.showError).toHaveBeenCalled();
    });
  });

  describe('row details', () => {
    it('loads details lazily when a row is expanded', () => {
      component.toggleDetails(ORDER);

      expect(component.isExpanded(ORDER.id)).toBe(true);
      expect(api.getSealedOrderDetails).toHaveBeenCalledTimes(1);
      expect(api.getSealedOrderDetails.mock.calls[0][0]).toBe(ORDER.id);
      expect(component.detailFor(ORDER.id)).toEqual(DETAILS);
    });

    it('does not reload cached details when a row is expanded again', () => {
      component.toggleDetails(ORDER);
      component.toggleDetails(ORDER);
      component.toggleDetails(ORDER);

      expect(component.isExpanded(ORDER.id)).toBe(true);
      expect(api.getSealedOrderDetails).toHaveBeenCalledTimes(1);
    });

    it('maps work entries to the correct status', () => {
      expect(component.workEntryStatus(CLOSED_ENTRY)).toBe('exportable');
      expect(component.workEntryStatus(SEALED_OPEN_ENTRY)).toBe('periodOpen');
      expect(component.workEntryStatus(UNSEALED_ENTRY)).toBe('notClosed');
    });
  });

  describe('ZIP export', () => {
    it('downloads the range export with format, language and currency', () => {
      component.rangeFrom.set({ year: 2026, month: 6, day: 1 });
      component.rangeUntil.set({ year: 2026, month: 6, day: 30 });

      component.onExport();

      expect(api.downloadOrderRangeExport).toHaveBeenCalledWith({
        fromDate: '2026-06-01',
        untilDate: '2026-06-30',
        format: 'xml',
        language: 'de',
        currencyCode: 'EUR',
      });
      expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(toastShowService.showSuccess).toHaveBeenCalled();
      expect(component.exporting()).toBe(false);
    });

    it('rejects an invalid range without calling the export API', () => {
      component.rangeFrom.set({ year: 2026, month: 7, day: 10 });
      component.rangeUntil.set({ year: 2026, month: 6, day: 1 });

      component.onExport();

      expect(api.downloadOrderRangeExport).not.toHaveBeenCalled();
      expect(toastShowService.showError).toHaveBeenCalled();
    });
  });
});
