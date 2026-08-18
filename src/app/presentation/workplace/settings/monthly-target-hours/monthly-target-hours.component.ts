// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for the company-wide monthly target hours table. Shows the twelve months of one
 * year directly in the card; the year is switched in the card header. A filled month applies to
 * employees without a contract and to contracts on the monthly target hours payment interval; an
 * empty field means no override, so the contract target applies, or the settings target for
 * employees without a contract. Changes are saved immediately.
 */
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  inject,
  signal,
  effect,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataManagementMonthlyTargetHoursService } from 'src/app/domain/services/scheduling/data-management-monthly-target-hours.service';
import { MONTHLY_TARGET_HOURS, MONTH_TRANSLATION_KEYS } from 'src/app/domain/constants/monthly-target-hours.constants';

@Component({
  selector: 'app-monthly-target-hours',
  templateUrl: './monthly-target-hours.component.html',
  styleUrls: ['./monthly-target-hours.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    SpinnerModule,
    SettingsListCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyTargetHoursComponent implements OnInit {
  public dataManagementMonthlyTargetHoursService = inject(DataManagementMonthlyTargetHoursService);
  public translate = inject(TranslateService);
  private toastShowService = inject(ToastShowService);
  private cdr = inject(ChangeDetectorRef);

  public readonly months = Array.from(
    { length: MONTHLY_TARGET_HOURS.maxMonth },
    (_, index) => index + MONTHLY_TARGET_HOURS.minMonth
  );

  public year = signal(new Date().getFullYear());
  public isDataLoaded = signal(false);

  private isReadEffect = effect(() => {
    if (this.dataManagementMonthlyTargetHoursService.isRead()) {
      this.cdr.markForCheck();
    }
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.dataManagementMonthlyTargetHoursService.init();
    } catch (error) {
      console.error('Error initializing monthly target hours:', error);
    } finally {
      this.isDataLoaded.set(true);
      this.cdr.markForCheck();
    }
  }

  hoursOf(month: number): number | undefined {
    return this.dataManagementMonthlyTargetHoursService.hoursOf(this.year(), month);
  }

  monthLabel(month: number): string {
    return this.translate.instant(MONTH_TRANSLATION_KEYS[month - MONTHLY_TARGET_HOURS.minMonth]);
  }

  overriddenMonthCount(): number {
    return this.dataManagementMonthlyTargetHoursService.rowsOfYear(this.year()).length;
  }

  previousYear(): void {
    this.year.update(current => Math.max(MONTHLY_TARGET_HOURS.minYear, current - 1));
    this.cdr.markForCheck();
  }

  nextYear(): void {
    this.year.update(current => Math.min(MONTHLY_TARGET_HOURS.maxYear, current + 1));
    this.cdr.markForCheck();
  }

  async onHoursChange(month: number, value: number | string | null | undefined): Promise<void> {
    const hours = value === null || value === undefined || value === '' ? undefined : Number(value);
    const errors = this.dataManagementMonthlyTargetHoursService.validateMonth(this.year(), hours);

    if (errors.length > 0) {
      this.toastShowService.showError(errors[0]);
      this.cdr.markForCheck();
      return;
    }

    const success = await this.dataManagementMonthlyTargetHoursService.saveMonth(
      this.year(),
      month,
      hours
    );

    if (!success) {
      this.toastShowService.showError(
        this.translate.instant('setting.monthlyTargetHours.save-failed')
      );
    }

    this.cdr.markForCheck();
  }
}
