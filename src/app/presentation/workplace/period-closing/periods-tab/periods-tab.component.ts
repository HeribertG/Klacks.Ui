// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Day-level sealed management for a selected billing period.
 * Shows all days in the period with seal checkboxes and bulk actions.
 * @param api - PeriodClosing API service for seal/unseal/summary
 * @param toastShowService - Toast notifications
 * @param translate - i18n service
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { SealedPeriodSummary } from 'src/app/infrastructure/api/period-closing/models/sealed-period-summary';
import { UsedPeriod } from 'src/app/infrastructure/api/period-closing/models/used-period';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

interface PeriodGroup {
  intervalKey: string;
  periods: UsedPeriod[];
}

@Component({
  selector: 'app-periods-tab',
  templateUrl: './periods-tab.component.html',
  styleUrls: ['./periods-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodsTabComponent implements OnInit {
  private api = inject(DataPeriodClosingService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);

  public usedPeriods = signal<UsedPeriod[]>([]);
  public selectedPeriodKey = signal<string | null>(null);
  public summary = signal<SealedPeriodSummary[]>([]);
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
      days.push(dataMap.get(iso) ?? { date: iso, totalWorkCount: 0, sealedWorkCount: 0, totalBreakCount: 0, sealedBreakCount: 0, isFullySealed: false });
      current.setDate(current.getDate() + 1);
    }
    return days;
  });

  public totalWork = computed(() => this.displayDays().reduce((a, s) => a + s.totalWorkCount, 0));
  public sealedWork = computed(() => this.displayDays().reduce((a, s) => a + s.sealedWorkCount, 0));
  public allSealed = computed(() => this.totalWork() > 0 && this.totalWork() === this.sealedWork());
  public hasPeriods = computed(() => this.usedPeriods().length > 0);
  public hasAnyEntries = computed(() => this.displayDays().some((s) => s.totalWorkCount > 0 || s.totalBreakCount > 0));
  public sealedDayCount = computed(() => this.displayDays().filter((s) => s.isFullySealed).length);
  public partialDayCount = computed(() => this.displayDays().filter((s) => this.hasEntries(s) && !s.isFullySealed).length);
  public emptyDayCount = computed(() => this.displayDays().filter((s) => !this.hasEntries(s)).length);

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
      return;
    }
    this.loading.set(true);
    this.api.getSealedPeriods(period.startDate, period.endDate, period.groupId).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onDaySealToggle(row: SealedPeriodSummary): void {
    if (row.isFullySealed) {
      this.unsealReasonDay.set(row.date);
      this.unsealReasonText.set('');
    } else {
      this.sealDay(row.date);
    }
  }

  confirmUnsealDay(): void {
    const day = this.unsealReasonDay();
    const reason = this.unsealReasonText().trim();
    if (!day || !reason) {
      this.toastShowService.showInfo(this.translate.instant('periodClosing.error.reasonRequired'));
      return;
    }
    this.unsealDay(day, reason);
    this.unsealReasonDay.set(null);
    this.unsealReasonText.set('');
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
    const bounds = this.getPeriodBounds(period);
    this.bulkLoading.set(true);
    this.api
      .seal({
        startDate: bounds.start,
        endDate: bounds.end,
        groupId: period.groupId,
        reason: null,
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
          this.toastShowService.showError(err?.error?.message ?? err?.message ?? 'Error');
          this.bulkLoading.set(false);
        },
      });
  }

  onBulkUnseal(): void {
    this.unsealReasonDay.set('__bulk__');
    this.unsealReasonText.set('');
  }

  confirmBulkUnseal(): void {
    const period = this.selectedPeriod();
    const reason = this.unsealReasonText().trim();
    if (!period || !reason) {
      this.toastShowService.showInfo(this.translate.instant('periodClosing.error.reasonRequired'));
      return;
    }
    this.bulkLoading.set(true);
    this.unsealReasonDay.set(null);
    this.unsealReasonText.set('');
    const bounds = this.getPeriodBounds(period);
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

  private sealDay(date: string): void {
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
