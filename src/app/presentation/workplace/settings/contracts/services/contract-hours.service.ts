// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guaranteed, minimum, maximum and full-time hours of the contract dialog, including the company value an
 * inheriting contract falls back to.
 * @param companyMonthlyHours - Monthly target hours of the current company month, undefined without a row
 */

import { ChangeDetectorRef, computed, inject, Injectable, signal } from '@angular/core';

import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import { transformNumberToOwnTime, transformOwnTimeToNumber } from 'src/app/domain/helpers/own-time.helper';
import { DataManagementMonthlyTargetHoursService } from 'src/app/domain/services/scheduling/data-management-monthly-target-hours.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { FULL_WORKLOAD_PERCENT } from '../contracts.constants';
import { ContractEditorStateService } from './contract-editor-state.service';

@Injectable()
export class ContractHoursService {
  private readonly state = inject(ContractEditorStateService);
  private readonly monthlyTargetHoursService = inject(DataManagementMonthlyTargetHoursService);
  private readonly settingsService = inject(DataManagementSettingsService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly companyMonthlyHours = signal<number | undefined>(undefined);

  /**
   * The company value an inheriting contract resolves to right now: the monthly target hours of the
   * current month when a row exists, otherwise the guaranteed-hours default setting, scaled by the
   * contract percent. Shown as a grey placeholder while the guaranteed-hours field is empty.
   */
  readonly inheritedGuaranteedHours = computed(() => {
    const basis =
      this.companyMonthlyHours() ??
      this.settingsService.appSettings.schedulingDefaultSettings().guaranteedHours;
    const percent = this.state.percent() ?? FULL_WORKLOAD_PERCENT;
    return (basis * percent) / FULL_WORKLOAD_PERCENT;
  });

  readonly inheritedGuaranteedHoursTime = computed(() =>
    transformNumberToOwnTime(this.inheritedGuaranteedHours(), true)
  );

  readonly inheritedGuaranteedHoursDisplay = computed(() => {
    const time = this.inheritedGuaranteedHoursTime();
    return `${time.hours}:${time.minutes}`;
  });

  readonly fullTimeIsEmpty = computed(() => transformOwnTimeToNumber(this.state.fullTime()) === 0);

  /**
   * The company-wide full-time default, shown as a grey placeholder while the contract's own
   * full-time field is empty (0).
   */
  readonly companyFullTimeTime = computed(() =>
    transformNumberToOwnTime(this.settingsService.appSettings.schedulingDefaultSettings().fullTime, true)
  );

  async loadCompanyMonthlyHours(): Promise<void> {
    try {
      await this.monthlyTargetHoursService.init();
      const today = companyToday();
      this.companyMonthlyHours.set(
        this.monthlyTargetHoursService.hoursOf(today.getFullYear(), today.getMonth() + 1)
      );
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading monthly target hours:', error);
    }
  }

  onGuaranteedHoursChange(value: OwnTime): void {
    this.state.guaranteedHoursInherited.set(false);
    this.state.guaranteedHours.set(value);
    if (this.state.editingContract) {
      this.state.editingContract.guaranteedHours = transformOwnTimeToNumber(value);
    }
  }

  resetGuaranteedHoursToCompanyValue(): void {
    this.state.guaranteedHoursInherited.set(true);
    this.state.guaranteedHours.set(OwnTime.forDuration('00', '00'));
    if (this.state.editingContract) {
      this.state.editingContract.guaranteedHours = undefined;
    }
  }

  onMinimumHoursChange(value: OwnTime): void {
    this.state.minimumHours.set(value);
    if (this.state.editingContract) {
      this.state.editingContract.minimumHours = transformOwnTimeToNumber(value);
    }
  }

  onMaximumHoursChange(value: OwnTime): void {
    this.state.maximumHours.set(value);
    if (this.state.editingContract) {
      this.state.editingContract.maximumHours = transformOwnTimeToNumber(value);
    }
  }

  onFullTimeChange(value: OwnTime): void {
    this.state.fullTime.set(value);
    if (this.state.editingContract) {
      this.state.editingContract.fullTime = transformOwnTimeToNumber(value);
    }
  }
}
