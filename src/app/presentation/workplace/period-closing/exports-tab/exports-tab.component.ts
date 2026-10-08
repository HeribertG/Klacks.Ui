// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Exports tab: three independent export flows, switched via an internal tab bar.
 * "Single order" picks a sealed order, format, language, currency, then downloads
 * the proof-of-service file; the server persists an ExportLog entry on success.
 * The export is keyed on the order (the SealedOrder shift), so renames or splits
 * of the operational shift never leak into the exported document.
 * "Employee hours" downloads hours/expenses/breaks for all employees (internal
 * and external) as XML for a date range, independent of individual orders.
 * "Orders in range" delegates to app-order-range-export-section, which downloads
 * a ZIP of every sealed order in a date range. A payroll download whose formatter could not write every entry
 * (response header X-Klacks-Export-Skipped) or whose absence mapping is invalid shows an info toast.
 * The payroll export is person-based and not group-scoped: the export button first asks the backend for a
 * preview. Blockers (entries not closed, days not locked, overlapping export) are listed and the export stays
 * disabled; days only a global period close can lock offer an admin action for that close. Without blockers the
 * new or changed persons are listed with checkboxes; exporting a subset sends their ids (a supplementary export).
 * A 409 of the export itself (blocked, nothing new, concurrent) is told apart by its machine-readable code.
 * @param activeTab - Which of the three export tabs is currently visible
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { ExportFormat } from 'src/app/infrastructure/api/period-closing/models/export-format';
import { SealedOrderListItem } from 'src/app/infrastructure/api/period-closing/models/sealed-order-list-item';
import { PayrollExportBlocker } from 'src/app/infrastructure/api/period-closing/models/payroll-export-blocker';
import { PayrollExportPreview } from 'src/app/infrastructure/api/period-closing/models/payroll-export-preview';
import { PayrollExportPerson } from 'src/app/infrastructure/api/period-closing/models/payroll-export-person';
import { PayrollExportConflict } from 'src/app/infrastructure/api/period-closing/models/payroll-export-conflict';
import { PAYROLL_EXPORT_ERROR_CODES } from 'src/app/infrastructure/api/period-closing/models/payroll-export-error-codes';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';import {
  firstOfMonth,
  lastOfMonth,
  ngbDateStructToIsoDate,
} from 'src/app/shared/helpers/ngb-date.helper';
import { CalendarDateToStringShort } from 'src/app/shared/helpers/date.helper';
import {
  CONTENT_DISPOSITION_HEADER,
  EXPORT_MAPPING_INVALID_HEADER,
  EXPORT_PERSONS_HEADER,
  EXPORT_SKIPPED_ENTRIES_HEADER,
  EXPORT_SUPPLEMENTARY_HEADER,
  extractFileNameFromContentDisposition,
  isSupplementaryExport,
  parseExportPersonCount,
  parseSkippedEntryCount,
  triggerBlobDownload,
} from 'src/app/shared/helpers/file-download.helper';
import { OrderRangeExportSectionComponent } from './order-range-export-section/order-range-export-section.component';
import { DEFAULT_EXPORT_FORMAT, FORMAT_LABEL_PREFIX, ExportFormatOption } from './export-format-options.constants';

import { DomainMessages } from 'src/app/domain/constants/messages';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType, KlacksyTargetRequestedEvent } from 'src/app/domain/events/domain-events';
import { EXPORTS_TAB_TARGETS, ExportsTabKey } from '../period-closing-target.constants';
import { errorCountToReconfirm } from '../period-seal-conflict';
import { parsePayrollExportConflict } from './payroll-export-conflict.parser';
import { PAYROLL_BLOCK_REASON_KEYS, PAYROLL_EMPTY_PLACEHOLDER } from './payroll-export.constants';
const CLIENT_EXPORT_CURRENCY_CODE = 'EUR';
const ORDER_FAMILY = 'order';
const PAYROLL_FAMILY = 'payroll';

const DEFAULT_EXPORTS_TAB: ExportsTabKey = 'single';

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
  private modalService = inject(ModalService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private destroyRef = inject(DestroyRef);

  public activeTab = signal<ExportsTabKey>(DEFAULT_EXPORTS_TAB);

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

  public isPayrollFormat = computed<boolean>(() =>
    this.payrollFormatKeys().has(this.clientExportFormat()),
  );

  public payrollPreview = signal<PayrollExportPreview | null>(null);
  public payrollBlockers = signal<PayrollExportBlocker[]>([]);
  public payrollBlockerTotal = signal<number>(0);
  public selectedPersonIds = signal<ReadonlySet<string>>(new Set());
  public globalCloseBusy = signal<boolean>(false);

  public payrollPersons = computed<PayrollExportPerson[]>(() => this.payrollPreview()?.newOrChangedPersons ?? []);
  public newPersonCount = computed<number>(() => this.payrollPersons().filter((p) => p.isNew).length);
  public changedPersonCount = computed<number>(() => this.payrollPersons().filter((p) => !p.isNew).length);
  public hasPayrollBlockers = computed<boolean>(() => this.payrollBlockers().length > 0);
  public blockersTruncated = computed<boolean>(() => this.payrollBlockerTotal() > this.payrollBlockers().length);
  public needsGlobalClose = computed<boolean>(() => this.payrollBlockers().some((b) => b.requiresGlobalClose));
  public selectedPersonCount = computed<number>(() => this.selectedPersonIds().size);
  public allPersonsSelected = computed<boolean>(() =>
    this.payrollPersons().length > 0 && this.selectedPersonIds().size === this.payrollPersons().length,
  );
  public canConfirmPayrollExport = computed<boolean>(() =>
    !this.hasPayrollBlockers() && (this.payrollPreview()?.canExport ?? false) && this.selectedPersonIds().size > 0,
  );

  constructor() {
    this.eventBus
      .on<KlacksyTargetRequestedEvent>(DomainEventType.KLACKSY_TARGET_REQUESTED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ target }) => {
        const tab = EXPORTS_TAB_TARGETS[target];
        if (tab) {
          this.setTab(tab);
        }
      });
  }

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

  setTab(tab: ExportsTabKey): void {
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
      language: this.translate.currentLang || this.translate.defaultLang || DomainMessages.DEFAULT_LANG,
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

  setClientExportFrom(value: NgbDateStruct | null): void {
    this.clientExportFrom.set(value);
    this.resetPayrollState();
  }

  setClientExportUntil(value: NgbDateStruct | null): void {
    this.clientExportUntil.set(value);
    this.resetPayrollState();
  }

  setClientExportFormat(value: ExportFormat): void {
    this.clientExportFormat.set(value);
    this.resetPayrollState();
  }

  onClientPeriodExport(): void {
    const range = this.readClientExportRange();
    if (!range) {
      return;
    }

    if (this.isPayrollFormat()) {
      this.loadPayrollPreview(range.fromDate, range.untilDate);
      return;
    }

    const format = this.clientExportFormat();
    const language = this.currentLanguage();
    const fallbackName = `client-period-export_${range.fromDate}_${range.untilDate}.${format}`;

    this.clientExportBusy.set(true);
    this.api.downloadClientPeriodExport({
      fromDate: range.fromDate,
      untilDate: range.untilDate,
      language,
      currencyCode: CLIENT_EXPORT_CURRENCY_CODE,
      format,
    }).subscribe({
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

  onPayrollExportConfirmed(): void {
    const range = this.readClientExportRange();
    if (!range || !this.canConfirmPayrollExport()) {
      return;
    }

    const format = this.clientExportFormat();
    const persons = this.payrollPersons();
    const selectedIds = this.selectedPersonIds();
    const clientIds = selectedIds.size < persons.length
      ? persons.filter((p) => selectedIds.has(p.clientId)).map((p) => p.clientId)
      : undefined;
    const fallbackName = `payroll-export_${range.fromDate}_${range.untilDate}.${format}`;

    this.clientExportBusy.set(true);
    this.api.downloadPayrollExport({
      fromDate: range.fromDate,
      untilDate: range.untilDate,
      language: this.currentLanguage(),
      format,
      ...(clientIds ? { clientIds } : {}),
    }).subscribe({
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
        const supplementary = isSupplementaryExport(res.headers.get(EXPORT_SUPPLEMENTARY_HEADER));
        const personCount = parseExportPersonCount(res.headers.get(EXPORT_PERSONS_HEADER));
        const msgKey = supplementary
          ? 'periodClosing.payroll.exportedSupplementary'
          : 'periodClosing.payroll.exportedPersons';
        const msg = this.translate.instant(msgKey, { file: fileName, count: personCount });
        const header = this.translate.instant('periodClosing.clientExport.title');
        this.toastShowService.showSuccess(msg, header);
        this.reportSkippedEntries(res.headers.get(EXPORT_SKIPPED_ENTRIES_HEADER), res.headers.get(EXPORT_MAPPING_INVALID_HEADER), format);
        this.resetPayrollState();
        this.clientExportBusy.set(false);
      },
      error: (err) => {
        void this.handlePayrollExportError(err, range.fromDate, range.untilDate);
      },
    });
  }

  onGlobalCloseRequested(): void {
    const range = this.readClientExportRange();
    if (!range) {
      return;
    }
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translate.instant('periodClosing.payroll.globalCloseTitle'),
      message: this.translate.instant('periodClosing.payroll.globalCloseBody', {
        from: CalendarDateToStringShort(range.fromDate),
        until: CalendarDateToStringShort(range.untilDate),
      }),
      confirmText: this.translate.instant('periodClosing.payroll.globalCloseAction'),
      cancelText: this.translate.instant('periodClosing.action.cancel'),
      onConfirm: () => this.closePeriodGlobally(range.fromDate, range.untilDate),
    });
  }

  isPersonSelected(person: PayrollExportPerson): boolean {
    return this.selectedPersonIds().has(person.clientId);
  }

  togglePerson(person: PayrollExportPerson): void {
    const next = new Set(this.selectedPersonIds());
    if (!next.delete(person.clientId)) {
      next.add(person.clientId);
    }
    this.selectedPersonIds.set(next);
  }

  toggleAllPersons(): void {
    this.selectedPersonIds.set(
      this.allPersonsSelected() ? new Set() : new Set(this.payrollPersons().map((p) => p.clientId)),
    );
  }

  blockerReasonKey(blocker: PayrollExportBlocker): string {
    return PAYROLL_BLOCK_REASON_KEYS[blocker.reason];
  }

  formatBlockerDate(blocker: PayrollExportBlocker): string {
    return blocker.date ? CalendarDateToStringShort(blocker.date) : PAYROLL_EMPTY_PLACEHOLDER;
  }

  formatBlockerGroup(blocker: PayrollExportBlocker): string {
    return blocker.groupName ?? PAYROLL_EMPTY_PLACEHOLDER;
  }

  private readClientExportRange(): { fromDate: string; untilDate: string } | null {
    const fromDate = ngbDateStructToIsoDate(this.clientExportFrom());
    const untilDate = ngbDateStructToIsoDate(this.clientExportUntil());

    if (!fromDate || !untilDate || fromDate > untilDate) {
      this.toastShowService.showError(this.translate.instant('periodClosing.clientExport.error.invalidRange'));
      return null;
    }
    return { fromDate, untilDate };
  }

  private currentLanguage(): string {
    return this.translate.currentLang || this.translate.defaultLang || DomainMessages.DEFAULT_LANG;
  }

  private resetPayrollState(): void {
    this.payrollPreview.set(null);
    this.payrollBlockers.set([]);
    this.payrollBlockerTotal.set(0);
    this.selectedPersonIds.set(new Set());
  }

  private loadPayrollPreview(fromDate: string, untilDate: string): void {
    this.clientExportBusy.set(true);
    this.api.getPayrollExportPreview(fromDate, untilDate, this.clientExportFormat()).subscribe({
      next: (preview) => {
        this.applyPayrollPreview(preview);
        this.clientExportBusy.set(false);
      },
      error: (err) => {
        this.toastShowService.showError(err?.error?.message ?? err?.message ?? 'Error');
        this.clientExportBusy.set(false);
      },
    });
  }

  private applyPayrollPreview(preview: PayrollExportPreview): void {
    this.payrollPreview.set(preview);
    this.payrollBlockers.set(preview.blockers ?? []);
    this.payrollBlockerTotal.set(preview.blockerTotal ?? 0);
    this.selectedPersonIds.set(new Set(preview.newOrChangedPersons.map((p) => p.clientId)));
  }

  private async handlePayrollExportError(
    err: { status?: number; error?: unknown; message?: string },
    fromDate: string,
    untilDate: string,
  ): Promise<void> {
    const conflict = await parsePayrollExportConflict(err);
    this.clientExportBusy.set(false);
    if (!conflict) {
      const body = err?.error as { message?: string } | undefined;
      this.toastShowService.showError(body?.message ?? err?.message ?? 'Error');
      return;
    }
    this.reportPayrollConflict(conflict, fromDate, untilDate);
  }

  private reportPayrollConflict(conflict: PayrollExportConflict, fromDate: string, untilDate: string): void {
    switch (conflict.code) {
      case PAYROLL_EXPORT_ERROR_CODES.blocked:
        this.payrollPreview.set(null);
        this.selectedPersonIds.set(new Set());
        this.payrollBlockers.set(conflict.blockers ?? []);
        this.payrollBlockerTotal.set(conflict.blockerTotal ?? conflict.blockers?.length ?? 0);
        this.toastShowService.showError(this.translate.instant('periodClosing.payroll.error.blocked'));
        break;
      case PAYROLL_EXPORT_ERROR_CODES.nothingNew:
        this.toastShowService.showInfo(this.translate.instant('periodClosing.payroll.error.nothingNew'));
        this.loadPayrollPreview(fromDate, untilDate);
        break;
      case PAYROLL_EXPORT_ERROR_CODES.concurrent:
        this.resetPayrollState();
        this.toastShowService.showError(this.translate.instant('periodClosing.payroll.error.concurrent'));
        break;
    }
  }

  private closePeriodGlobally(
    fromDate: string,
    untilDate: string,
    acknowledgeViolations = false,
    acknowledgedErrorCount: number | null = null,
  ): void {
    this.globalCloseBusy.set(true);
    this.api
      .seal({
        startDate: fromDate,
        endDate: untilDate,
        groupId: null,
        reason: null,
        acknowledgeViolations,
        acknowledgedErrorCount,
      })
      .subscribe({
        next: (count) => {
          this.globalCloseBusy.set(false);
          this.toastShowService.showSuccess(
            this.translate.instant('periodClosing.success.sealed', { count }),
            this.translate.instant('periodClosing.action.seal'),
          );
          this.loadPayrollPreview(fromDate, untilDate);
        },
        error: (err) => {
          this.globalCloseBusy.set(false);
          const retryCount = errorCountToReconfirm(err, acknowledgeViolations, acknowledgedErrorCount);
          if (retryCount !== undefined) {
            this.openViolationConfirmation(() => this.closePeriodGlobally(fromDate, untilDate, true, retryCount));
            return;
          }
          this.toastShowService.showError(err?.error?.message ?? err?.message ?? 'Error');
        },
      });
  }

  private openViolationConfirmation(onConfirm: () => void): void {
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translate.instant('periodClosing.confirm.violationsTitle'),
      message: this.translate.instant('periodClosing.confirm.violationsBody'),
      confirmText: this.translate.instant('periodClosing.action.sealAnyway'),
      cancelText: this.translate.instant('periodClosing.action.cancel'),
      onConfirm,
    });
  }
  private reportSkippedEntries(skippedHeader: string | null, mappingInvalidHeader: string | null, format: string): void {
    const skipped = parseSkippedEntryCount(skippedHeader);
    const formatLabel = this.translate.instant(`${FORMAT_LABEL_PREFIX}${format}`);
    if (skipped > 0) {
      this.toastShowService.showInfo(
        this.translate.instant('periodClosing.clientExport.skippedEntries', { count: skipped, format: formatLabel }),
      );
    }
    if (mappingInvalidHeader) {
      this.toastShowService.showInfo(
        this.translate.instant('periodClosing.clientExport.mappingInvalid', { format: formatLabel }),
      );
    }
  }

  formatOrderLabel(order: SealedOrderListItem): string {
    const range = this.formatPeriod(order.fromDate, order.untilDate);
    const customer = order.customerName ?? this.translate.instant('periodClosing.form.noCustomer');
    const abbr = order.abbreviation ? `${order.abbreviation} – ` : '';
    const counts = `${order.closedWorks}/${order.totalWorks}`;
    return `${abbr}${order.name} – ${customer} – ${range} – ${counts}`;
  }

  private formatPeriod(from: string, until: string | null): string {
    const fromTxt = CalendarDateToStringShort(from);
    const untilTxt = until ? CalendarDateToStringShort(until) : fromTxt;
    return fromTxt === untilTxt ? fromTxt : `${fromTxt}–${untilTxt}`;
  }

}
