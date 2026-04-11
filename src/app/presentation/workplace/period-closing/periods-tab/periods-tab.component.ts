// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Periods tab: admin selects a date range, then seals or reopens work entries.
 * Unseal requires a non-empty reason. Shows aggregate sealing counts for the range.
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { SealedPeriodSummary } from 'src/app/infrastructure/api/period-closing/models/sealed-period-summary';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

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

  public startDate = signal<string>(this.firstOfCurrentMonth());
  public endDate = signal<string>(this.lastOfCurrentMonth());
  public groupId = signal<string | null>(null);
  public reason = signal<string>('');
  public summary = signal<SealedPeriodSummary[]>([]);
  public loading = signal<boolean>(false);

  public totalWork = computed(() => this.summary().reduce((a, s) => a + s.totalWorkCount, 0));
  public sealedWork = computed(() => this.summary().reduce((a, s) => a + s.sealedWorkCount, 0));
  public fullySealed = computed(() => this.totalWork() > 0 && this.totalWork() === this.sealedWork());

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading.set(true);
    this.api.getSealedPeriods(this.startDate(), this.endDate(), this.groupId()).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSeal(): void {
    this.api
      .seal({
        startDate: this.startDate(),
        endDate: this.endDate(),
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
    if (!this.reason().trim()) {
      this.toastShowService.showInfo(this.translate.instant('periodClosing.error.reasonRequired'));
      return;
    }
    this.api
      .unseal({
        startDate: this.startDate(),
        endDate: this.endDate(),
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

  private firstOfCurrentMonth(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }

  private lastOfCurrentMonth(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
}
