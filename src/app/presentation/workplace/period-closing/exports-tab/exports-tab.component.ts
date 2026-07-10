// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Exports tab: three independent export flows, switched via an internal tab bar.
 * "Single order" picks a sealed order, format, language, currency, then downloads
 * the proof-of-service file; the server persists an ExportLog entry on success.
 * The export is keyed on the order (the SealedOrder shift), so renames or splits
 * of the operational shift never leak into the exported document.
 * "Employee hours" downloads hours/expenses/breaks for all employees (internal
 * and external) as XML for a date range, independent of individual orders.
 * "Orders in range" delegates to app-order-range-export-section, which downloads
 * a ZIP of every sealed order in a date range.
 * @param activeTab - Which of the three export tabs is currently visible
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RefreshButtonComponent } from 'src/app/presentation/shared/refresh-button/refresh-button.component';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { GroupFilter, IGroup } from 'src/app/domain/models/group/group-class';
import { ExportFormat } from 'src/app/infrastructure/api/period-closing/models/export-format';
import { SealedOrderListItem } from 'src/app/infrastructure/api/period-closing/models/sealed-order-list-item';
import {
  firstOfMonth,
  lastOfMonth,
  ngbDateStructToIsoDate,
} from 'src/app/shared/helpers/ngb-date.helper';
import { DateToStringShort } from 'src/app/shared/helpers/date.helper';
import {
  CONTENT_DISPOSITION_HEADER,
  extractFileNameFromContentDisposition,
  triggerBlobDownload,
} from 'src/app/shared/helpers/file-download.helper';
import { OrderRangeExportSectionComponent } from './order-range-export-section/order-range-export-section.component';
import { DEFAULT_EXPORT_FORMAT, FORMAT_LABEL_PREFIX, ExportFormatOption } from './export-format-options.constants';

const CLIENT_EXPORT_CURRENCY_CODE = 'EUR';
const ORDER_FAMILY = 'order';
const PAYROLL_FAMILY = 'payroll';
const GROUP_LIST_PAGE_SIZE = 10000;

type ExportsTab = 'single' | 'employee' | 'range';
const DEFAULT_EXPORTS_TAB: ExportsTab = 'single';

@Component({
  selector: 'app-exports-tab',
  templateUrl: './exports-tab.component.html',
  styleUrls: ['./exports-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RefreshButtonComponent,
    DateInputComponent,
    SearchInputComponent,
    OrderRangeExportSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportsTabComponent implements OnInit {
  private api = inject(DataPeriodClosingService);
  private exportFormatsApi = inject(DataExportFormatsService);
  private groupApi = inject(DataGroupService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);

  public activeTab = signal<ExportsTab>(DEFAULT_EXPORTS_TAB);

  public filterFrom = signal<NgbDateStruct | null>(firstOfMonth(-1));
  public filterUntil = signal<NgbDateStruct | null>(lastOfMonth(0));
  public searchTerm = signal<string>('');

  public orders = signal<SealedOrderListItem[]>([]);
  public selectedOrderId = signal<string | null>(null);
  public loadingOrders = signal<boolean>(false);

  public format = signal<ExportFormat>(DEFAULT_EXPORT_FORMAT);
  public busy = signal<boolean>(false);

  public clientExportFrom = signal<NgbDateStruct | null>(firstOfMonth(-1));
  public clientExportUntil = signal<NgbDateStruct | null>(lastOfMonth(0));
  public clientExportBusy = signal<boolean>(false);
  public clientExportFormat = signal<ExportFormat>(DEFAULT_EXPORT_FORMAT);

  public formats = signal<ExportFormatOption[]>([
    { key: DEFAULT_EXPORT_FORMAT, labelKey: `${FORMAT_LABEL_PREFIX}${DEFAULT_EXPORT_FORMAT}` },
  ]);

  public clientExportFormats = signal<ExportFormatOption[]>([
    { key: DEFAULT_EXPORT_FORMAT, labelKey: `${FORMAT_LABEL_PREFIX}${DEFAULT_EXPORT_FORMAT}` },
  ]);

  private payrollFormatKeys = signal<Set<string>>(new Set());
  public groups = signal<IGroup[]>([]);
  public selectedGroupId = signal<string | null>(null);

  public isPayrollFormat = computed<boolean>(() =>
    this.payrollFormatKeys().has(this.clientExportFormat()),
  );

  ngOnInit(): void {
    this.exportFormatsApi.getFormats().subscribe({
      next: (list) => {
        const enabled = list.filter((f) => f.enabled && f.family === ORDER_FAMILY);
        this.formats.set(
          enabled.map((f) => ({
            key: f.key as ExportFormat,
            labelKey: `${FORMAT_LABEL_PREFIX}${f.key}`,
          })),
        );
        if (!enabled.some((f) => f.key === this.format())) {
          const fallback = enabled[0]?.key as ExportFormat | undefined;
          if (fallback) {
            this.format.set(fallback);
          }
        }

        const generic = list.filter((f) => f.fixed);
        const payroll = list.filter((f) => f.enabled && f.family === PAYROLL_FAMILY);
        const employeeFormats = [...generic, ...payroll];
        if (employeeFormats.length > 0) {
          this.clientExportFormats.set(
            employeeFormats.map((f) => ({
              key: f.key as ExportFormat,
              labelKey: `${FORMAT_LABEL_PREFIX}${f.key}`,
            })),
          );
          this.payrollFormatKeys.set(new Set(payroll.map((f) => f.key)));
          if (!employeeFormats.some((f) => f.key === this.clientExportFormat())) {
            this.clientExportFormat.set(employeeFormats[0].key as ExportFormat);
          }
        }
      },
      error: () => {
        // Keep the built-in default format option if the backend call fails.
      },
    });

    this.loadGroups();
  }

  private loadGroups(): void {
    const filter = new GroupFilter();
    filter.numberOfItemsPerPage = GROUP_LIST_PAGE_SIZE;
    filter.requiredPage = 0;
    this.groupApi.readGroupList(filter).subscribe({
      next: (result) => this.groups.set(result.groups ?? []),
      error: () => this.groups.set([]),
    });
  }

  public selectedOrder = computed<SealedOrderListItem | null>(() => {
    const id = this.selectedOrderId();
    if (!id) return null;
    return this.orders().find(o => o.id === id) ?? null;
  });

  public showOrderResults = computed<boolean>(() => {
    const term = this.searchTerm().trim();
    if (term.length === 0) return false;
    const selectedLabel = this.selectedOrder() ? this.formatOrderLabel(this.selectedOrder()!) : '';
    return term !== selectedLabel;
  });

  setTab(tab: ExportsTab): void {
    this.activeTab.set(tab);
  }

  reloadOrders(): void {
    this.loadingOrders.set(true);
    const from = ngbDateStructToIsoDate(this.filterFrom());
    const until = ngbDateStructToIsoDate(this.filterUntil());
    const search = this.searchTerm().trim() || null;
    this.api.listSealedOrders(from, until, null, search).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        if (this.selectedOrderId() && !orders.some(o => o.id === this.selectedOrderId())) {
          this.selectedOrderId.set(null);
        }
        this.loadingOrders.set(false);
      },
      error: () => {
        this.orders.set([]);
        this.loadingOrders.set(false);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    if (value.trim().length === 0) {
      this.orders.set([]);
      return;
    }
    this.reloadOrders();
  }

  onOrderSelected(order: SealedOrderListItem): void {
    this.selectedOrderId.set(order.id);
    this.searchTerm.set(this.formatOrderLabel(order));
  }

  onExport(): void {
    const order = this.selectedOrder();
    if (!order) {
      this.toastShowService.showError(this.translate.instant('periodClosing.error.noOrderSelected'));
      return;
    }

    if (order.totalWorks > 0 && order.closedWorks < order.totalWorks) {
      this.toastShowService.showInfo(
        this.translate.instant('periodClosing.warning.partialClosed', {
          closed: order.closedWorks,
          total: order.totalWorks,
        }),
      );
    }

    this.busy.set(true);
    this.api.downloadOrderExport({
      orderIds: [order.id],
      fromDate: ngbDateStructToIsoDate(this.filterFrom()),
      untilDate: ngbDateStructToIsoDate(this.filterUntil()),
      format: this.format(),
      language: this.translate.currentLang || this.translate.defaultLang || 'de',
      groupId: null,
    }).subscribe({
      next: (res) => {
        const blob = res.body;
        if (!blob) {
          this.toastShowService.showError('Empty response body');
          this.busy.set(false);
          return;
        }
        const fileName = extractFileNameFromContentDisposition(res.headers.get(CONTENT_DISPOSITION_HEADER))
          ?? `order-export_${order.abbreviation || order.id}.${this.format()}`;
        triggerBlobDownload(blob, fileName);
        const msg = this.translate.instant('periodClosing.success.exported', { file: fileName });
        const header = this.translate.instant('periodClosing.action.export');
        this.toastShowService.showSuccess(msg, header);
        this.busy.set(false);
      },
      error: (err) => {
        const msg: string = err?.error?.message ?? err?.message ?? 'Error';
        this.toastShowService.showError(msg);
        this.busy.set(false);
      },
    });
  }

  onClientPeriodExport(): void {
    const fromDate = ngbDateStructToIsoDate(this.clientExportFrom());
    const untilDate = ngbDateStructToIsoDate(this.clientExportUntil());

    if (!fromDate || !untilDate || fromDate > untilDate) {
      this.toastShowService.showError(this.translate.instant('periodClosing.clientExport.error.invalidRange'));
      return;
    }

    const format = this.clientExportFormat();
    const language = this.translate.currentLang || this.translate.defaultLang || 'de';
    const isPayroll = this.isPayrollFormat();
    const groupId = this.selectedGroupId();

    if (isPayroll && !groupId) {
      this.toastShowService.showError(this.translate.instant('periodClosing.clientExport.error.groupRequired'));
      return;
    }

    const request$ = isPayroll
      ? this.api.downloadPayrollExport({ groupId: groupId!, fromDate, untilDate, language, format })
      : this.api.downloadClientPeriodExport({
          fromDate,
          untilDate,
          language,
          currencyCode: CLIENT_EXPORT_CURRENCY_CODE,
          format,
        });

    const fallbackName = isPayroll
      ? `payroll-export_${fromDate}_${untilDate}.${format}`
      : `client-period-export_${fromDate}_${untilDate}.${format}`;

    this.clientExportBusy.set(true);
    request$.subscribe({
      next: (res) => {
        const blob = res.body;
        if (!blob) {
          this.toastShowService.showError('Empty response body');
          this.clientExportBusy.set(false);
          return;
        }
        const fileName = extractFileNameFromContentDisposition(res.headers.get(CONTENT_DISPOSITION_HEADER))
          ?? fallbackName;
        triggerBlobDownload(blob, fileName);
        const msg = this.translate.instant('periodClosing.success.exported', { file: fileName });
        const header = this.translate.instant('periodClosing.clientExport.title');
        this.toastShowService.showSuccess(msg, header);
        this.clientExportBusy.set(false);
      },
      error: (err) => {
        const msg: string = err?.error?.message ?? err?.message ?? 'Error';
        this.toastShowService.showError(msg);
        this.clientExportBusy.set(false);
      },
    });
  }

  formatOrderLabel(order: SealedOrderListItem): string {
    const range = this.formatPeriod(order.fromDate, order.untilDate);
    const customer = order.customerName ?? this.translate.instant('periodClosing.form.noCustomer');
    const abbr = order.abbreviation ? `${order.abbreviation} – ` : '';
    const counts = `${order.closedWorks}/${order.totalWorks}`;
    return `${abbr}${order.name} – ${customer} – ${range} – ${counts}`;
  }

  private formatPeriod(from: string, until: string | null): string {
    const fromTxt = DateToStringShort(from);
    const untilTxt = until ? DateToStringShort(until) : fromTxt;
    return fromTxt === untilTxt ? fromTxt : `${fromTxt}–${untilTxt}`;
  }

}
