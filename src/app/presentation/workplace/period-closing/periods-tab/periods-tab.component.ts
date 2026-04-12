// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Periods tab: admin selects an existing billing period from a dropdown,
 * then seals or reopens work entries for that period. Unseal requires a
 * non-empty reason. The dropdown only shows periods that actually contain
 * non-deleted work or break entries on non-deleted clients.
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
  public groupId = signal<string | null>(null);
  public reason = signal<string>('');
  public summary = signal<SealedPeriodSummary[]>([]);
  public loading = signal<boolean>(false);
  public loadingPeriods = signal<boolean>(false);

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
  public fullySealed = computed(() => this.totalWork() > 0 && this.totalWork() === this.sealedWork());
  public hasPeriods = computed(() => this.usedPeriods().length > 0);

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
    this.api.getSealedPeriods(period.startDate, period.endDate, this.groupId()).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSeal(): void {
    const period = this.selectedPeriod();
    if (!period) {
      return;
    }
    this.api
      .seal({
        startDate: period.startDate,
        endDate: period.endDate,
        groupId: this.groupId(),
        reason: this.reason() || null,
      })
      .subscribe({
        next: (count) => {
          const msg = this.translate.instant('periodClosing.success.sealed', { count });
          const header = this.translate.instant('periodClosing.action.seal');
          this.toastShowService.showSuccess(msg, header);
          this.reason.set('');
          this.loadSummary();
        },
        error: (err) => {
          const msg: string = err?.error?.message ?? err?.message ?? 'Error';
          this.toastShowService.showError(msg);
        },
      });
  }

  onUnseal(): void {
    const period = this.selectedPeriod();
    if (!period) {
      return;
    }
    if (!this.reason().trim()) {
      this.toastShowService.showInfo(this.translate.instant('periodClosing.error.reasonRequired'));
      return;
    }
    this.api
      .unseal({
        startDate: period.startDate,
        endDate: period.endDate,
        groupId: this.groupId(),
        reason: this.reason().trim(),
      })
      .subscribe({
        next: (count) => {
          const msg = this.translate.instant('periodClosing.success.unsealed', { count });
          const header = this.translate.instant('periodClosing.action.unseal');
          this.toastShowService.showSuccess(msg, header);
          this.reason.set('');
          this.loadSummary();
        },
        error: (err) => {
          const msg: string = err?.error?.message ?? err?.message ?? 'Error';
          this.toastShowService.showError(msg);
        },
      });
  }

  public periodKey(p: UsedPeriod): string {
    return `${p.startDate}_${p.endDate}_${p.paymentInterval}`;
  }

  public formatPeriodLabel(p: UsedPeriod): string {
    return `${this.formatDate(p.startDate)} – ${this.formatDate(p.endDate)}`;
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
