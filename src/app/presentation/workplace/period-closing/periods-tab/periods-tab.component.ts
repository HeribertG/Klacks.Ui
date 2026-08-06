// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Day-level sealed management for a selected billing period.
 * Shows all days in the period with seal checkboxes and bulk actions.
 * Seal and unseal always require an explicit confirmation dialog; the
 * unseal confirmation additionally warns when an export already exists.
 * @param api - PeriodClosing API service for seal/unseal/summary
 * @param toastShowService - Toast notifications
 * @param translate - i18n service
 * @param modalService - Global confirmation modal service
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RefreshButtonComponent } from 'src/app/presentation/shared/refresh-button/refresh-button.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { ExportLog } from 'src/app/infrastructure/api/period-closing/models/export-log';
import { PeriodIssue } from 'src/app/infrastructure/api/period-closing/models/period-issue';
import { SealedPeriodSummary } from 'src/app/infrastructure/api/period-closing/models/sealed-period-summary';
import { UsedPeriod } from 'src/app/infrastructure/api/period-closing/models/used-period';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/schedule/data-shift-schedule.service';
import { IShiftScheduleFilter, ShiftScheduleFilter } from 'src/app/domain/models/schedule/shift-schedule-class';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { PeriodIssuesCardComponent } from '../period-issues-card/period-issues-card.component';

const SHIFT_LOAD_LIMIT = 10000;
const BULK_UNSEAL_KEY = '__bulk__';
const ISO_DATE_LENGTH = 10;

// The backend answers a seal that would pass over unresolved errors with 409.
const HTTP_STATUS_CONFLICT = 409;

interface PeriodGroup {
  intervalKey: string;
  periods: UsedPeriod[];
}

@Component({
  selector: 'app-periods-tab',
  templateUrl: './periods-tab.component.html',
  styleUrls: ['./periods-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RefreshButtonComponent, ExpandableCardComponent, PeriodIssuesCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodsTabComponent implements OnInit {
  private api = inject(DataPeriodClosingService);
  private shiftScheduleApi = inject(DataShiftScheduleService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);
  private modalService = inject(ModalService);

  public readonly bulkUnsealKey = BULK_UNSEAL_KEY;

  public usedPeriods = signal<UsedPeriod[]>([]);
  public selectedPeriodKey = signal<string | null>(null);
  public summary = signal<SealedPeriodSummary[]>([]);
  public issues = signal<PeriodIssue[]>([]);
  public exportLogs = signal<ExportLog[]>([]);
  public unstaffedShiftCount = signal<number>(0);
  public unstaffedShiftTruncated = signal<boolean>(false);
  public loading = signal<boolean>(false);
  public loadingPeriods = signal<boolean>(false);
  public sealingDay = signal<string | null>(null);
  public bulkLoading = signal<boolean>(false);
  public unsealReasonDay = signal<string | null>(null);
  public unsealReasonText = signal<string>('');

  public selectedPeriod = computed<UsedPeriod | null>(() => {
    const key = this.selectedPeriodKey();
    if (!key) {
      return null;
    }
    return this.usedPeriods().find((p) => this.periodKey(p) === key) ?? null;
  });

  public periodGroups = computed<PeriodGroup[]>(() => {
    const map = new Map<number, UsedPeriod[]>();
    for (const p of this.usedPeriods()) {
      const list = map.get(p.paymentInterval) ?? [];
      list.push(p);
      map.set(p.paymentInterval, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([interval, periods]) => ({
        intervalKey: this.intervalTranslationKey(interval),
        periods,
      }));
  });

  public displayDays = computed<SealedPeriodSummary[]>(() => {
    const period = this.selectedPeriod();
    const apiData = this.summary();
    if (!period) {
      return [];
    }
    const { start, end } = this.getPeriodBounds(period);
    const dataMap = new Map(apiData.map((s) => [s.date, s]));
    const days: SealedPeriodSummary[] = [];
    const current = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    while (current <= endDate) {
      const iso = this.toLocalIso(current);
      days.push(dataMap.get(iso) ?? { date: iso, totalWorkCount: 0, sealedWorkCount: 0, totalBreakCount: 0, sealedBreakCount: 0, isFullySealed: false, isDaySealed: false });
      current.setDate(current.getDate() + 1);
    }
    return days;
  });

  public totalWork = computed(() => this.displayDays().reduce((a, s) => a + s.totalWorkCount, 0));
  public sealedWork = computed(() => this.displayDays().reduce((a, s) => a + s.sealedWorkCount, 0));
  public allSealed = computed(() => {
    const days = this.displayDays();
    return days.length > 0 && days.every((s) => s.isDaySealed);
  });
  public hasPeriods = computed(() => this.usedPeriods().length > 0);
  public sealedDayCount = computed(() => this.displayDays().filter((s) => s.isDaySealed).length);
  public partialDayCount = computed(() => this.displayDays().filter((s) => !s.isDaySealed && this.hasEntries(s) && !s.isFullySealed).length);
  public emptyDayCount = computed(() => this.displayDays().filter((s) => !s.isDaySealed && !this.hasEntries(s)).length);

  ngOnInit(): void {
    this.loadUsedPeriods();
  }

  loadUsedPeriods(): void {
    this.loadingPeriods.set(true);
    this.api.getUsedPeriods().subscribe({
      next: (periods) => {
        this.usedPeriods.set(periods);
        this.loadingPeriods.set(false);
        if (periods.length > 0 && !this.selectedPeriodKey()) {
          this.selectedPeriodKey.set(this.periodKey(periods[0]));
          this.loadSummary();
        }
      },
      error: () => this.loadingPeriods.set(false),
    });
  }

  onPeriodChange(key: string): void {
    this.selectedPeriodKey.set(key);
    this.loadSummary();
  }

  loadSummary(): void {
    const period = this.selectedPeriod();
    if (!period) {
      this.summary.set([]);
      this.issues.set([]);
      this.exportLogs.set([]);
      this.unstaffedShiftCount.set(0);
      this.unstaffedShiftTruncated.set(false);
      return;
    }
    this.loading.set(true);
    const bounds = this.getPeriodBounds(period);
    const shiftFilter: IShiftScheduleFilter = new ShiftScheduleFilter();
    shiftFilter.startDate = bounds.start;
    shiftFilter.endDate = bounds.end;
    shiftFilter.selectedGroup = period.groupId ?? undefined;
    shiftFilter.rowCount = SHIFT_LOAD_LIMIT;
    forkJoin({
      summary: this.api.getSealedPeriods(period.startDate, period.endDate, period.groupId),
      issues: this.api.getPeriodIssues(period.startDate, period.endDate, period.groupId),
      shifts: this.shiftScheduleApi.getShiftSchedule(shiftFilter),
      exportLogs: this.api.getExportLog(bounds.start, bounds.end).pipe(catchError(() => of([] as ExportLog[]))),
    }).subscribe({
      next: ({ summary, issues, shifts, exportLogs }) => {
        this.summary.set(summary);
        this.issues.set(issues);
        this.exportLogs.set(exportLogs);
        let total = 0;
        for (const shift of shifts.shifts) {
          const need = shift.sumEmployees * shift.quantity;
          const gap = need - shift.engaged;
          if (gap > 0) total += gap;
        }
        this.unstaffedShiftCount.set(total);
        this.unstaffedShiftTruncated.set(shifts.totalCount > shifts.shifts.length);
        this.loading.set(false);
      },
      error: () => {
        this.unstaffedShiftCount.set(0);
        this.unstaffedShiftTruncated.set(false);
        this.loading.set(false);
      },
    });
  }

  onDaySealToggle(row: SealedPeriodSummary, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    checkbox.checked = row.isDaySealed;
    if (row.isDaySealed) {
      this.unsealReasonDay.set(row.date);
      this.unsealReasonText.set('');
    } else {
      this.openSealConfirmation(this.unsealedEntryCount(row), () => this.sealDay(row.date));
    }
  }

  confirmUnsealDay(): void {
    const day = this.unsealReasonDay();
    const reason = this.unsealReasonText().trim();
    if (!day || !reason) {
      this.toastShowService.showInfo(this.translate.instant('periodClosing.error.reasonRequired'));
      return;
    }
    this.openUnsealConfirmation(day, () => {
      this.unsealReasonDay.set(null);
      this.unsealReasonText.set('');
      this.unsealDay(day, reason);
    });
  }

  cancelUnsealDay(): void {
    this.unsealReasonDay.set(null);
    this.unsealReasonText.set('');
  }

  onBulkSeal(): void {
    const period = this.selectedPeriod();
    if (!period) {
      return;
    }
    const count = this.displayDays().reduce((a, s) => a + this.unsealedEntryCount(s), 0);
    this.openSealConfirmation(count, () => this.executeBulkSeal(period));
  }

  onBulkUnseal(): void {
    this.unsealReasonDay.set(BULK_UNSEAL_KEY);
    this.unsealReasonText.set('');
  }

  confirmBulkUnseal(): void {
    const period = this.selectedPeriod();
    const reason = this.unsealReasonText().trim();
    if (!period || !reason) {
      this.toastShowService.showInfo(this.translate.instant('periodClosing.error.reasonRequired'));
      return;
    }
    this.openUnsealConfirmation(null, () => {
      this.unsealReasonDay.set(null);
      this.unsealReasonText.set('');
      this.executeBulkUnseal(period, reason);
    });
  }

  public periodKey(p: UsedPeriod): string {
    return `${p.startDate}_${p.endDate}_${p.paymentInterval}_${p.groupId ?? 'none'}`;
  }

  public formatPeriodLabel(p: UsedPeriod): string {
    const label = p.paymentInterval === 2 ? this.formatMonthYear(p.startDate, p.endDate) : `${this.formatDate(p.startDate)} – ${this.formatDate(p.endDate)}`;
    return p.groupName ? `${label} — ${p.groupName}` : label;
  }

  public hasEntries(row: SealedPeriodSummary): boolean {
    return row.totalWorkCount > 0 || row.totalBreakCount > 0;
  }

  private openSealConfirmation(count: number, onConfirm: () => void): void {
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translate.instant('periodClosing.confirm.sealTitle'),
      message: this.translate.instant('periodClosing.confirm.sealBody', { count }),
      confirmText: this.translate.instant('periodClosing.action.seal'),
      cancelText: this.translate.instant('periodClosing.action.cancel'),
      onConfirm,
    });
  }

  private openUnsealConfirmation(day: string | null, onConfirm: () => void): void {
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translate.instant('periodClosing.confirm.unsealTitle'),
      message: this.buildUnsealMessage(day),
      confirmText: this.translate.instant('periodClosing.action.unseal'),
      cancelText: this.translate.instant('periodClosing.action.cancel'),
      onConfirm,
    });
  }

  private buildUnsealMessage(day: string | null): string {
    const body = this.translate.instant('periodClosing.confirm.unsealBody');
    const exportLog = this.findRelevantExport(day);
    if (!exportLog) {
      return body;
    }
    const warning = this.translate.instant('periodClosing.warning.hasExport', {
      date: new Date(exportLog.exportedAt).toLocaleDateString(),
    });
    return `${body} ${warning}`;
  }

  private findRelevantExport(day: string | null): ExportLog | null {
    const period = this.selectedPeriod();
    return (
      this.exportLogs().find((log) => {
        const matchesGroup = !period?.groupId || !log.groupId || log.groupId === period.groupId;
        const start = log.startDate.slice(0, ISO_DATE_LENGTH);
        const end = log.endDate.slice(0, ISO_DATE_LENGTH);
        const matchesDay = !day || (start <= day && end >= day);
        return matchesGroup && matchesDay;
      }) ?? null
    );
  }

  private unsealedEntryCount(row: SealedPeriodSummary): number {
    return row.totalWorkCount - row.sealedWorkCount + row.totalBreakCount - row.sealedBreakCount;
  }

  private executeBulkSeal(period: UsedPeriod, acknowledgeViolations = false): void {
    const bounds = this.getPeriodBounds(period);
    this.bulkLoading.set(true);
    this.api
      .seal({
        startDate: bounds.start,
        endDate: bounds.end,
        groupId: period.groupId,
        reason: null,
        acknowledgeViolations,
      })
      .subscribe({
        next: (count) => {
          const msg = this.translate.instant('periodClosing.success.sealed', { count });
          const header = this.translate.instant('periodClosing.action.seal');
          this.toastShowService.showSuccess(msg, header);
          this.bulkLoading.set(false);
          this.loadSummary();
        },
        error: (err) => {
          this.bulkLoading.set(false);
          if (err?.status === HTTP_STATUS_CONFLICT && !acknowledgeViolations) {
            this.openViolationConfirmation(() => this.executeBulkSeal(period, true));
            return;
          }
          this.toastShowService.showError(err?.error?.message ?? err?.message ?? 'Error');
        },
      });
  }

  /**
   * Second confirmation, shown only when the backend refused because the period still holds errors.
   * Closing over a known violation stays possible - it must not happen unnoticed, because the seal
   * makes those days unwritable.
   */
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

  private executeBulkUnseal(period: UsedPeriod, reason: string): void {
    const bounds = this.getPeriodBounds(period);
    this.bulkLoading.set(true);
    this.api
      .unseal({
        startDate: bounds.start,
        endDate: bounds.end,
        groupId: period.groupId,
        reason,
      })
      .subscribe({
        next: (count) => {
          const msg = this.translate.instant('periodClosing.success.unsealed', { count });
          const header = this.translate.instant('periodClosing.action.unseal');
          this.toastShowService.showSuccess(msg, header);
          this.bulkLoading.set(false);
          this.loadSummary();
        },
        error: (err) => {
          this.toastShowService.showError(err?.error?.message ?? err?.message ?? 'Error');
          this.bulkLoading.set(false);
        },
      });
  }

  private sealDay(date: string, acknowledgeViolations = false): void {
    const period = this.selectedPeriod();
    if (!period) {
      return;
    }
    this.sealingDay.set(date);
    this.api
      .seal({
        startDate: date,
        endDate: date,
        groupId: period.groupId,
        reason: null,
        acknowledgeViolations,
      })
      .subscribe({
        next: () => {
          this.sealingDay.set(null);
          this.loadSummary();
        },
        error: (err) => {
          this.sealingDay.set(null);
          if (err?.status === HTTP_STATUS_CONFLICT && !acknowledgeViolations) {
            this.openViolationConfirmation(() => this.sealDay(date, true));
            return;
          }
          this.toastShowService.showError(err?.error?.message ?? err?.message ?? 'Error');
        },
      });
  }

  private unsealDay(date: string, reason: string): void {
    const period = this.selectedPeriod();
    if (!period) {
      return;
    }
    this.sealingDay.set(date);
    this.api
      .unseal({
        startDate: date,
        endDate: date,
        groupId: period.groupId,
        reason,
      })
      .subscribe({
        next: () => {
          this.sealingDay.set(null);
          this.loadSummary();
        },
        error: (err) => {
          this.toastShowService.showError(err?.error?.message ?? err?.message ?? 'Error');
          this.sealingDay.set(null);
        },
      });
  }

  private getPeriodBounds(p: UsedPeriod): { start: string; end: string } {
    if (p.paymentInterval !== 2) {
      return { start: p.startDate, end: p.endDate };
    }
    const s = new Date(`${p.startDate}T00:00:00`);
    const e = new Date(`${p.endDate}T00:00:00`);
    const mid = new Date((s.getTime() + e.getTime()) / 2);
    const firstDay = new Date(mid.getFullYear(), mid.getMonth(), 1);
    const lastDay = new Date(mid.getFullYear(), mid.getMonth() + 1, 0);
    return {
      start: this.toLocalIso(firstDay),
      end: this.toLocalIso(lastDay),
    };
  }

  private toLocalIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDate(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString();
  }

  private formatMonthYear(startIso: string, endIso: string): string {
    const start = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);
    const mid = new Date((start.getTime() + end.getTime()) / 2);
    return mid.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  private intervalTranslationKey(interval: number): string {
    switch (interval) {
      case 0:
        return 'periodClosing.paymentInterval.weekly';
      case 1:
        return 'periodClosing.paymentInterval.biweekly';
      case 2:
        return 'periodClosing.paymentInterval.monthly';
      case 3:
        return 'periodClosing.paymentInterval.individual';
      default:
        return 'periodClosing.paymentInterval.monthly';
    }
  }
}
