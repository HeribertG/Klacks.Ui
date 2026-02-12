import {
  Component,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, Field } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';

interface WorkSettingsFormModel {
  defaultWorkingHours: number;
  overtimeThreshold: number;
  vacationDaysPerYear: number;
  probationPeriod: number;
  noticePeriod: number;
  paymentInterval: string;
  guaranteedHours: number;
  maximumHours: number;
  minimumHours: number;
  fullTime: number;
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
  dayVisibleBefore: number;
  dayVisibleAfter: number;
  schedulingMaxWorkDays: number;
  schedulingMinRestDays: number;
  schedulingMinPauseHours: number;
  schedulingMaxOptimalGap: number;
  schedulingMaxDailyHours: number;
  schedulingMaxWeeklyHours: number;
  schedulingMaxConsecutiveDays: number;
}

@Component({
  selector: 'app-work-setting',
  templateUrl: './work-setting.component.html',
  styleUrls: ['./work-setting.component.scss'],
  standalone: true,
  imports: [FormsModule, Field, TranslateModule, NgbModule],
})
export class WorkSettingComponent implements OnInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private contractService = inject(DataManagementContractService);

  public isDataLoaded = false;
  public hasContracts = false;

  public formModel = signal<WorkSettingsFormModel>({
    defaultWorkingHours: 0,
    overtimeThreshold: 0,
    vacationDaysPerYear: 0,
    probationPeriod: 0,
    noticePeriod: 0,
    paymentInterval: '0',
    guaranteedHours: 0,
    maximumHours: 0,
    minimumHours: 0,
    fullTime: 0,
    nightRate: 0,
    holidayRate: 0,
    saRate: 0,
    soRate: 0,
    dayVisibleBefore: 0,
    dayVisibleAfter: 0,
    schedulingMaxWorkDays: 5,
    schedulingMinRestDays: 2,
    schedulingMinPauseHours: 12,
    schedulingMaxOptimalGap: 2,
    schedulingMaxDailyHours: 10,
    schedulingMaxWeeklyHours: 50,
    schedulingMaxConsecutiveDays: 6,
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
    this.formModel.set({
      defaultWorkingHours: svc.defaultWorkingHours,
      overtimeThreshold: svc.overtimeThreshold,
      vacationDaysPerYear: svc.vacationDaysPerYear,
      probationPeriod: svc.probationPeriod,
      noticePeriod: svc.noticePeriod,
      paymentInterval: String(svc.paymentInterval),
      guaranteedHours: svc.guaranteedHours,
      maximumHours: svc.maximumHours,
      minimumHours: svc.minimumHours,
      fullTime: svc.fullTime,
      nightRate: svc.nightRate,
      holidayRate: svc.holidayRate,
      saRate: svc.saRate,
      soRate: svc.soRate,
      dayVisibleBefore: svc.dayVisibleBefore,
      dayVisibleAfter: svc.dayVisibleAfter,
      schedulingMaxWorkDays: svc.schedulingMaxWorkDays,
      schedulingMinRestDays: svc.schedulingMinRestDays,
      schedulingMinPauseHours: svc.schedulingMinPauseHours,
      schedulingMaxOptimalGap: svc.schedulingMaxOptimalGap,
      schedulingMaxDailyHours: svc.schedulingMaxDailyHours,
      schedulingMaxWeeklyHours: svc.schedulingMaxWeeklyHours,
      schedulingMaxConsecutiveDays: svc.schedulingMaxConsecutiveDays,
    });
  }

  private syncToService(data: WorkSettingsFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.defaultWorkingHours = data.defaultWorkingHours;
    svc.overtimeThreshold = data.overtimeThreshold;
    svc.vacationDaysPerYear = data.vacationDaysPerYear;
    svc.probationPeriod = data.probationPeriod;
    svc.noticePeriod = data.noticePeriod;
    svc.paymentInterval = Number(data.paymentInterval);
    svc.guaranteedHours = data.guaranteedHours;
    svc.maximumHours = data.maximumHours;
    svc.minimumHours = data.minimumHours;
    svc.fullTime = data.fullTime;
    svc.nightRate = data.nightRate;
    svc.holidayRate = data.holidayRate;
    svc.saRate = data.saRate;
    svc.soRate = data.soRate;
    svc.dayVisibleBefore = data.dayVisibleBefore;
    svc.dayVisibleAfter = data.dayVisibleAfter;
    svc.schedulingMaxWorkDays = data.schedulingMaxWorkDays;
    svc.schedulingMinRestDays = data.schedulingMinRestDays;
    svc.schedulingMinPauseHours = data.schedulingMinPauseHours;
    svc.schedulingMaxOptimalGap = data.schedulingMaxOptimalGap;
    svc.schedulingMaxDailyHours = data.schedulingMaxDailyHours;
    svc.schedulingMaxWeeklyHours = data.schedulingMaxWeeklyHours;
    svc.schedulingMaxConsecutiveDays = data.schedulingMaxConsecutiveDays;
    svc.settingsChangeTrigger.update(v => v + 1);
  }

  onPaymentIntervalChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.formModel.update(m => ({ ...m, paymentInterval: value }));
  }
}
