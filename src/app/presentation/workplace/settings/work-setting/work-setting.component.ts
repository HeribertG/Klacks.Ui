// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';

interface WorkSettingsFormModel {
  vacationDaysPerYear: number;
  probationPeriod: number;
  noticePeriod: number;
  paymentInterval: string;
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
  dayVisibleBefore: number;
  dayVisibleAfter: number;
}

@Component({
  selector: 'app-work-setting',
  templateUrl: './work-setting.component.html',
  styleUrls: ['./work-setting.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule],
})
export class WorkSettingComponent implements OnInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private contractService = inject(DataManagementContractService);

  public isDataLoaded = false;
  public hasContracts = false;

  public formModel = signal<WorkSettingsFormModel>({
    vacationDaysPerYear: 0,
    probationPeriod: 0,
    noticePeriod: 0,
    paymentInterval: '0',
    nightRate: 0,
    holidayRate: 0,
    saRate: 0,
    soRate: 0,
    dayVisibleBefore: 0,
    dayVisibleAfter: 0,
  });

  workForm = form(this.formModel);

  constructor() {
    effect(() => {
      const isReset = this.dataManagementSettingsService.isReset();
      if (isReset && !this.isDataLoaded) {
        this.loadFromService();
        this.isDataLoaded = true;
      }
    });

    effect(() => {
      const data = this.formModel();
      if (this.isDataLoaded) {
        this.syncToService(data);
      }
    });

    effect(() => {
      const data = this.formModel();
      const clamped = {
        nightRate: Math.max(0, Math.min(100, data.nightRate)),
        holidayRate: Math.max(0, Math.min(100, data.holidayRate)),
        saRate: Math.max(0, Math.min(100, data.saRate)),
        soRate: Math.max(0, Math.min(100, data.soRate)),
        dayVisibleBefore: Math.max(0, Math.min(31, data.dayVisibleBefore)),
        dayVisibleAfter: Math.max(0, Math.min(31, data.dayVisibleAfter)),
      };

      if (
        clamped.nightRate !== data.nightRate ||
        clamped.holidayRate !== data.holidayRate ||
        clamped.saRate !== data.saRate ||
        clamped.soRate !== data.soRate ||
        clamped.dayVisibleBefore !== data.dayVisibleBefore ||
        clamped.dayVisibleAfter !== data.dayVisibleAfter
      ) {
        this.formModel.update(m => ({
          ...m,
          nightRate: clamped.nightRate,
          holidayRate: clamped.holidayRate,
          saRate: clamped.saRate,
          soRate: clamped.soRate,
          dayVisibleBefore: clamped.dayVisibleBefore,
          dayVisibleAfter: clamped.dayVisibleAfter,
        }));
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.checkContracts();
    if (!this.isDataLoaded) {
      this.loadFromService();
      this.isDataLoaded = true;
    }
  }

  private async checkContracts(): Promise<void> {
    if (!this.contractService.isRead()) {
      await this.contractService.readContracts();
    }
    this.hasContracts = this.contractService.contracts.length > 0;
  }

  private loadFromService(): void {
    const svc = this.dataManagementSettingsService;
    const work = svc.appSettings.workSettings();
    this.formModel.set({
      vacationDaysPerYear: work.vacationDaysPerYear,
      probationPeriod: work.probationPeriod,
      noticePeriod: work.noticePeriod,
      paymentInterval: String(work.paymentInterval),
      nightRate: svc.nightRate,
      holidayRate: svc.holidayRate,
      saRate: svc.saRate,
      soRate: svc.soRate,
      dayVisibleBefore: work.dayVisibleBefore,
      dayVisibleAfter: work.dayVisibleAfter,
    });
  }

  private syncToService(data: WorkSettingsFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.appSettings.workSettings.update(s => ({
      ...s,
      vacationDaysPerYear: data.vacationDaysPerYear,
      probationPeriod: data.probationPeriod,
      noticePeriod: data.noticePeriod,
      paymentInterval: Number(data.paymentInterval),
      dayVisibleBefore: data.dayVisibleBefore,
      dayVisibleAfter: data.dayVisibleAfter,
    }));
    svc.nightRate = data.nightRate;
    svc.holidayRate = data.holidayRate;
    svc.saRate = data.saRate;
    svc.soRate = data.soRate;
    svc.settingsChangeTrigger.update(v => v + 1);
  }

  onPaymentIntervalChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.formModel.update(m => ({ ...m, paymentInterval: value }));
  }
}
