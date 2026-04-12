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

  public totalWork = computed(() => this.summary().reduce((a, s) => a + s.totalWorkCount, 0));
  public sealedWork = computed(() => this.summary().reduce((a, s) => a + s.sealedWorkCount, 0));
  public allSealed = computed(() => this.totalWork() > 0 && this.totalWork() === this.sealedWork());
  public hasPeriods = computed(() => this.usedPeriods().length > 0);
  public hasAnyEntries = computed(() => this.summary().some((s) => s.totalWorkCount > 0 || s.totalBreakCount > 0));

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
    this.bulkLoading.set(true);
    this.api
      .seal({
        startDate: period.startDate,
        endDate: period.endDate,
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
    this.api
      .unseal({
        startDate: period.startDate,
        endDate: period.endDate,
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
    const label = `${this.formatDate(p.startDate)} – ${this.formatDate(p.endDate)}`;
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

  private formatDate(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString();
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
