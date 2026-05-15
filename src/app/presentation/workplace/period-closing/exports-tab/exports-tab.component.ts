// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Exports tab: pick a sealed order, format, language, currency, then download
 * the proof-of-service file. After a successful download the server persists
 * an ExportLog entry automatically. The export is keyed on the order (the
 * SealedOrder shift), so renames or splits of the operational shift never leak
 * into the exported document.
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { SealedOrderListItem } from 'src/app/infrastructure/api/period-closing/models/sealed-order-list-item';
import {
  firstOfMonth,
  lastOfMonth,
  ngbDateStructToIsoDate,
} from 'src/app/shared/helpers/ngb-date.helper';
import { DateToStringShort } from 'src/app/shared/helpers/date.helper';

type ExportFormat = 'csv' | 'json' | 'xml' | 'datev' | 'bmd';

@Component({
  selector: 'app-exports-tab',
  templateUrl: './exports-tab.component.html',
  styleUrls: ['./exports-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DateInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportsTabComponent implements OnInit {
  private api = inject(DataPeriodClosingService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);

  public filterFrom = signal<NgbDateStruct | null>(firstOfMonth(-1));
  public filterUntil = signal<NgbDateStruct | null>(lastOfMonth(0));

  public orders = signal<SealedOrderListItem[]>([]);
  public selectedOrderId = signal<string | null>(null);
  public loadingOrders = signal<boolean>(false);

  public format = signal<ExportFormat>('csv');
  public language = signal<string>('de');
  public currency = signal<string>('EUR');
  public busy = signal<boolean>(false);

  public readonly formats: { key: ExportFormat; labelKey: string }[] = [
    { key: 'csv',   labelKey: 'periodClosing.format.csv' },
    { key: 'json',  labelKey: 'periodClosing.format.json' },
    { key: 'xml',   labelKey: 'periodClosing.format.xml' },
    { key: 'datev', labelKey: 'periodClosing.format.datev' },
    { key: 'bmd',   labelKey: 'periodClosing.format.bmd' },
  ];

  public selectedOrder = computed<SealedOrderListItem | null>(() => {
    const id = this.selectedOrderId();
    if (!id) return null;
    return this.orders().find(o => o.id === id) ?? null;
  });

  ngOnInit(): void {
    this.reloadOrders();
  }

  reloadOrders(): void {
    this.loadingOrders.set(true);
    const from = ngbDateStructToIsoDate(this.filterFrom());
    const until = ngbDateStructToIsoDate(this.filterUntil());
    this.api.listSealedOrders(from, until, null).subscribe({
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
      language: this.language(),
      currencyCode: this.currency(),
      groupId: null,
    }).subscribe({
      next: (res) => {
        const blob = res.body;
        if (!blob) {
          this.toastShowService.showError('Empty response body');
          this.busy.set(false);
          return;
        }
        const fileName = this.extractFileName(res.headers.get('content-disposition'))
          ?? `order-export_${order.abbreviation || order.id}.${this.format()}`;
        this.triggerDownload(blob, fileName);
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

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private extractFileName(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return match?.[1] ?? null;
  }
}
