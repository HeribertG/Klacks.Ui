// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * ERP period export section: previews all sealed orders within a date range,
 * lets each order row expand into a lazily loaded work-entry detail table, and
 * downloads a ZIP containing one export file per order plus a client period XML.
 * @param rangeFrom - Start of the export date range (defaults to first day of previous month)
 * @param rangeUntil - End of the export date range (defaults to last day of current month)
 * @param format - Selected export format for the files inside the ZIP (defaults to xml)
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { RefreshButtonComponent } from 'src/app/presentation/shared/refresh-button/refresh-button.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { SimplePaginationComponent } from 'src/app/presentation/shared/simple-pagination/simple-pagination.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';
import { ExportFormat } from 'src/app/infrastructure/api/period-closing/models/export-format';
import { ISealedOrderDetails } from 'src/app/infrastructure/api/period-closing/models/sealed-order-details';
import { ISealedOrderWorkEntry } from 'src/app/infrastructure/api/period-closing/models/sealed-order-work-entry';
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
import { DEFAULT_EXPORT_FORMAT, FORMAT_LABEL_PREFIX, ExportFormatOption } from '../export-format-options.constants';

type WorkEntryStatus = 'exportable' | 'periodOpen' | 'notClosed';

const RANGE_EXPORT_CURRENCY_CODE = 'EUR';
const FALLBACK_LANGUAGE = 'de';
const SEALED_LOCK_LEVEL = 3;
const EMPTY_VALUE_PLACEHOLDER = '—';
const EMPTY_RESPONSE_BODY_MESSAGE = 'Empty response body';
const GENERIC_ERROR_MESSAGE = 'Error';
const ORDERS_PAGE_SIZE = 10;
const FIRST_PAGE = 1;

@Component({
  selector: 'app-order-range-export-section',
  templateUrl: './order-range-export-section.component.html',
  styleUrls: ['./order-range-export-section.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RefreshButtonComponent,
    DateInputComponent,
    SimplePaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderRangeExportSectionComponent implements OnInit {
  private api = inject(DataPeriodClosingService);
  private exportFormatsApi = inject(DataExportFormatsService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);

  public rangeFrom = signal<NgbDateStruct | null>(firstOfMonth(-1));
  public rangeUntil = signal<NgbDateStruct | null>(lastOfMonth(0));
  public format = signal<ExportFormat>(DEFAULT_EXPORT_FORMAT);

  public orders = signal<SealedOrderListItem[]>([]);
  public loadingOrders = signal<boolean>(false);
  public hasLoaded = signal<boolean>(false);
  public exporting = signal<boolean>(false);

  public page = signal<number>(FIRST_PAGE);
  public readonly pageSize = ORDERS_PAGE_SIZE;
  public pagedOrders = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.orders().slice(start, start + this.pageSize);
  });

  public expandedOrderIds = signal<ReadonlySet<string>>(new Set<string>());
  public orderDetails = signal<ReadonlyMap<string, ISealedOrderDetails>>(new Map<string, ISealedOrderDetails>());
  public loadingDetailIds = signal<ReadonlySet<string>>(new Set<string>());

  public readonly emptyPlaceholder = EMPTY_VALUE_PLACEHOLDER;

  public formats = signal<ExportFormatOption[]>([
    { key: DEFAULT_EXPORT_FORMAT, labelKey: `${FORMAT_LABEL_PREFIX}${DEFAULT_EXPORT_FORMAT}` },
  ]);

  public readonly statusMeta: Record<WorkEntryStatus, { cssClass: string; labelKey: string }> = {
    exportable: { cssClass: 'status-exportable',  labelKey: 'periodClosing.rangeExport.status.exportable' },
    periodOpen: { cssClass: 'status-period-open', labelKey: 'periodClosing.rangeExport.status.periodOpen' },
    notClosed:  { cssClass: 'status-not-closed',  labelKey: 'periodClosing.rangeExport.status.notClosed' },
  };

  ngOnInit(): void {
    this.reloadOrders();
    this.loadFormats();
  }

  private loadFormats(): void {
    this.exportFormatsApi.getFormats().subscribe({
      next: (list) => {
        const enabled = list.filter((f) => f.enabled);
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
      },
      error: () => {
        // Keep the built-in default format option if the backend call fails.
      },
    });
  }

  reloadOrders(): void {
    const fromDate = ngbDateStructToIsoDate(this.rangeFrom());
    const untilDate = ngbDateStructToIsoDate(this.rangeUntil());
    if (!this.isRangeValid(fromDate, untilDate)) {
      this.showInvalidRangeError();
      return;
    }

    this.loadingOrders.set(true);
    this.expandedOrderIds.set(new Set<string>());
    this.orderDetails.set(new Map<string, ISealedOrderDetails>());
    this.api.listSealedOrders(fromDate, untilDate, null, null).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.page.set(FIRST_PAGE);
        this.hasLoaded.set(true);
        this.loadingOrders.set(false);
      },
      error: (err) => {
        this.orders.set([]);
        this.hasLoaded.set(true);
        this.loadingOrders.set(false);
        this.showRequestError(err);
      },
    });
  }

  onPageChange(page: number): void {
    this.page.set(page);
  }

  toggleDetails(order: SealedOrderListItem): void {
    const expanded = new Set(this.expandedOrderIds());
    if (expanded.has(order.id)) {
      expanded.delete(order.id);
    } else {
      expanded.add(order.id);
      this.loadDetailsIfNeeded(order.id);
    }
    this.expandedOrderIds.set(expanded);
  }

  isExpanded(orderId: string): boolean {
    return this.expandedOrderIds().has(orderId);
  }

  isDetailLoading(orderId: string): boolean {
    return this.loadingDetailIds().has(orderId);
  }

  detailFor(orderId: string): ISealedOrderDetails | null {
    return this.orderDetails().get(orderId) ?? null;
  }

  workEntryStatus(entry: ISealedOrderWorkEntry): WorkEntryStatus {
    if (entry.periodClosed) return 'exportable';
    return entry.lockLevel >= SEALED_LOCK_LEVEL ? 'periodOpen' : 'notClosed';
  }

  formatWorkDate(isoDate: string): string {
    return DateToStringShort(isoDate);
  }

  onExport(): void {
    const fromDate = ngbDateStructToIsoDate(this.rangeFrom());
    const untilDate = ngbDateStructToIsoDate(this.rangeUntil());
    if (!fromDate || !untilDate || fromDate > untilDate) {
      this.showInvalidRangeError();
      return;
    }

    this.exporting.set(true);
    this.api.downloadOrderRangeExport({
      fromDate,
      untilDate,
      format: this.format(),
      language: this.translate.currentLang || this.translate.defaultLang || FALLBACK_LANGUAGE,
      currencyCode: RANGE_EXPORT_CURRENCY_CODE,
    }).subscribe({
      next: (res) => {
        const blob = res.body;
        if (!blob) {
          this.toastShowService.showError(EMPTY_RESPONSE_BODY_MESSAGE);
          this.exporting.set(false);
          return;
        }
        const fileName = extractFileNameFromContentDisposition(res.headers.get(CONTENT_DISPOSITION_HEADER))
          ?? `erp-order-export_${fromDate}_${untilDate}.zip`;
        triggerBlobDownload(blob, fileName);
        const msg = this.translate.instant('periodClosing.success.exported', { file: fileName });
        const header = this.translate.instant('periodClosing.rangeExport.title');
        this.toastShowService.showSuccess(msg, header);
        this.exporting.set(false);
      },
      error: (err) => {
        this.exporting.set(false);
        this.showRequestError(err);
      },
    });
  }

  private loadDetailsIfNeeded(orderId: string): void {
    if (this.orderDetails().has(orderId) || this.loadingDetailIds().has(orderId)) {
      return;
    }
    const fromDate = ngbDateStructToIsoDate(this.rangeFrom());
    const untilDate = ngbDateStructToIsoDate(this.rangeUntil());
    this.setDetailLoading(orderId, true);
    this.api.getSealedOrderDetails(orderId, fromDate, untilDate).subscribe({
      next: (details) => {
        const map = new Map(this.orderDetails());
        map.set(orderId, details);
        this.orderDetails.set(map);
        this.setDetailLoading(orderId, false);
      },
      error: (err) => {
        this.setDetailLoading(orderId, false);
        this.showRequestError(err);
      },
    });
  }

  private setDetailLoading(orderId: string, loading: boolean): void {
    const ids = new Set(this.loadingDetailIds());
    if (loading) {
      ids.add(orderId);
    } else {
      ids.delete(orderId);
    }
    this.loadingDetailIds.set(ids);
  }

  private isRangeValid(fromDate: string | null, untilDate: string | null): boolean {
    return !!fromDate && !!untilDate && fromDate <= untilDate;
  }

  private showInvalidRangeError(): void {
    this.toastShowService.showError(this.translate.instant('periodClosing.rangeExport.error.invalidRange'));
  }

  private showRequestError(err: { error?: { message?: string }; message?: string } | null): void {
    const msg: string = err?.error?.message ?? err?.message ?? GENERIC_ERROR_MESSAGE;
    this.toastShowService.showError(msg);
  }
}
