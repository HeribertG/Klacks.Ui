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

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RefreshButtonComponent } from 'src/app/presentation/shared/refresh-button/refresh-button.component';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
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
import { DEFAULT_EXPORT_FORMAT, EXPORT_FORMAT_OPTIONS } from './export-format-options.constants';

const CLIENT_EXPORT_CURRENCY_CODE = 'EUR';

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
export class ExportsTabComponent {
  private api = inject(DataPeriodClosingService);
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

  public readonly formats = EXPORT_FORMAT_OPTIONS;

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

    this.clientExportBusy.set(true);
    this.api.downloadClientPeriodExport({
      fromDate,
      untilDate,
      language: this.translate.currentLang || this.translate.defaultLang || 'de',
      currencyCode: CLIENT_EXPORT_CURRENCY_CODE,
    }).subscribe({
      next: (res) => {
        const blob = res.body;
        if (!blob) {
          this.toastShowService.showError('Empty response body');
          this.clientExportBusy.set(false);
          return;
        }
        const fileName = extractFileNameFromContentDisposition(res.headers.get(CONTENT_DISPOSITION_HEADER))
          ?? `client-period-export_${fromDate}_${untilDate}.xml`;
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
