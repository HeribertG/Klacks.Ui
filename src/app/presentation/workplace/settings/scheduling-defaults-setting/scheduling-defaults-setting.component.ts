// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, ChangeDetectionStrategy,
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

interface SchedulingDefaultsFormModel {
  defaultWorkingHours: number;
  overtimeThreshold: number;
  guaranteedHours: number;
  maximumHours: number;
  minimumHours: number;
  fullTime: number;
  schedulingMaxWorkDays: number;
  schedulingMinRestDays: number;
  schedulingMinPauseHours: number;
  schedulingMaxOptimalGap: number;
  schedulingMaxDailyHours: number;
  schedulingMaxWeeklyHours: number;
  schedulingMaxConsecutiveDays: number;
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
  workOnMonday: boolean;
  workOnTuesday: boolean;
  workOnWednesday: boolean;
  workOnThursday: boolean;
  workOnFriday: boolean;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  performsShiftWork: boolean;
  weekendMonday: boolean;
  weekendTuesday: boolean;
  weekendWednesday: boolean;
  weekendThursday: boolean;
  weekendFriday: boolean;
  weekendSaturday: boolean;
  weekendSunday: boolean;
  weekStartDay: string;
  commandKeywordFree: string;
  commandKeywordEarly: string;
  commandKeywordLate: string;
  commandKeywordNight: string;
  commandKeywordNegFree: string;
  commandKeywordNegEarly: string;
  commandKeywordNegLate: string;
  commandKeywordNegNight: string;
}

@Component({
  selector: 'app-scheduling-defaults-setting',
  templateUrl: './scheduling-defaults-setting.component.html',
  styleUrls: ['./scheduling-defaults-setting.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingDefaultsSettingComponent implements OnInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);

  public isDataLoaded = false;

  public formModel = signal<SchedulingDefaultsFormModel>({
    defaultWorkingHours: 8.5,
    overtimeThreshold: 42,
    guaranteedHours: 170,
    maximumHours: 200,
    minimumHours: 160,
    fullTime: 180,
    schedulingMaxWorkDays: 5,
    schedulingMinRestDays: 2,
    schedulingMinPauseHours: 12,
    schedulingMaxOptimalGap: 2,
    schedulingMaxDailyHours: 10,
    schedulingMaxWeeklyHours: 50,
    schedulingMaxConsecutiveDays: 6,
    nightRate: 10,
    holidayRate: 10,
    saRate: 10,
    soRate: 10,
    workOnMonday: true,
    workOnTuesday: true,
    workOnWednesday: true,
    workOnThursday: true,
    workOnFriday: true,
    workOnSaturday: false,
    workOnSunday: false,
    performsShiftWork: false,
    weekendMonday: false,
    weekendTuesday: false,
    weekendWednesday: false,
    weekendThursday: false,
    weekendFriday: false,
    weekendSaturday: true,
    weekendSunday: true,
    weekStartDay: 'Monday',
    commandKeywordFree: 'FREE',
    commandKeywordEarly: 'EARLY',
    commandKeywordLate: 'LATE',
    commandKeywordNight: 'NIGHT',
    commandKeywordNegFree: '-FREE',
    commandKeywordNegEarly: '-EARLY',
    commandKeywordNegLate: '-LATE',
    commandKeywordNegNight: '-NIGHT',
  });

  schedulingForm = form(this.formModel);

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
  }

  ngOnInit(): void {
    if (!this.isDataLoaded) {
      this.loadFromService();
      this.isDataLoaded = true;
    }
  }

  private loadFromService(): void {
    const svc = this.dataManagementSettingsService;
    const sched = svc.appSettings.schedulingDefaultSettings();
    this.formModel.set({
      defaultWorkingHours: sched.defaultWorkingHours,
      overtimeThreshold: sched.overtimeThreshold,
      guaranteedHours: sched.guaranteedHours,
      maximumHours: sched.maximumHours,
      minimumHours: sched.minimumHours,
      fullTime: sched.fullTime,
      schedulingMaxWorkDays: sched.schedulingMaxWorkDays,
      schedulingMinRestDays: sched.schedulingMinRestDays,
      schedulingMinPauseHours: sched.schedulingMinPauseHours,
      schedulingMaxOptimalGap: sched.schedulingMaxOptimalGap,
      schedulingMaxDailyHours: sched.schedulingMaxDailyHours,
      schedulingMaxWeeklyHours: sched.schedulingMaxWeeklyHours,
      schedulingMaxConsecutiveDays: sched.schedulingMaxConsecutiveDays,
      nightRate: svc.nightRate,
      holidayRate: svc.holidayRate,
      saRate: svc.saRate,
      soRate: svc.soRate,
      workOnMonday: sched.workOnMonday,
      workOnTuesday: sched.workOnTuesday,
      workOnWednesday: sched.workOnWednesday,
      workOnThursday: sched.workOnThursday,
      workOnFriday: sched.workOnFriday,
      workOnSaturday: sched.workOnSaturday,
      workOnSunday: sched.workOnSunday,
      performsShiftWork: sched.performsShiftWork,
      weekendMonday: sched.weekendDays.includes('Monday'),
      weekendTuesday: sched.weekendDays.includes('Tuesday'),
      weekendWednesday: sched.weekendDays.includes('Wednesday'),
      weekendThursday: sched.weekendDays.includes('Thursday'),
      weekendFriday: sched.weekendDays.includes('Friday'),
      weekendSaturday: sched.weekendDays.includes('Saturday'),
      weekendSunday: sched.weekendDays.includes('Sunday'),
      weekStartDay: sched.weekStartDay,
      commandKeywordFree: sched.commandKeywordFree,
      commandKeywordEarly: sched.commandKeywordEarly,
      commandKeywordLate: sched.commandKeywordLate,
      commandKeywordNight: sched.commandKeywordNight,
      commandKeywordNegFree: sched.commandKeywordNegFree,
      commandKeywordNegEarly: sched.commandKeywordNegEarly,
      commandKeywordNegLate: sched.commandKeywordNegLate,
      commandKeywordNegNight: sched.commandKeywordNegNight,
    });
  }

  private syncToService(data: SchedulingDefaultsFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.appSettings.schedulingDefaultSettings.update(s => ({
      ...s,
      defaultWorkingHours: data.defaultWorkingHours,
      overtimeThreshold: data.overtimeThreshold,
      guaranteedHours: data.guaranteedHours,
      maximumHours: data.maximumHours,
      minimumHours: data.minimumHours,
      fullTime: data.fullTime,
      schedulingMaxWorkDays: data.schedulingMaxWorkDays,
      schedulingMinRestDays: data.schedulingMinRestDays,
      schedulingMinPauseHours: data.schedulingMinPauseHours,
      schedulingMaxOptimalGap: data.schedulingMaxOptimalGap,
      schedulingMaxDailyHours: data.schedulingMaxDailyHours,
      schedulingMaxWeeklyHours: data.schedulingMaxWeeklyHours,
      schedulingMaxConsecutiveDays: data.schedulingMaxConsecutiveDays,
      workOnMonday: data.workOnMonday,
      workOnTuesday: data.workOnTuesday,
      workOnWednesday: data.workOnWednesday,
      workOnThursday: data.workOnThursday,
      workOnFriday: data.workOnFriday,
      workOnSaturday: data.workOnSaturday,
      workOnSunday: data.workOnSunday,
      performsShiftWork: data.performsShiftWork,
      weekendDays: buildWeekendDays(data),
      weekStartDay: data.weekStartDay,
      commandKeywordFree: data.commandKeywordFree,
      commandKeywordEarly: data.commandKeywordEarly,
      commandKeywordLate: data.commandKeywordLate,
      commandKeywordNight: data.commandKeywordNight,
      commandKeywordNegFree: data.commandKeywordNegFree,
      commandKeywordNegEarly: data.commandKeywordNegEarly,
      commandKeywordNegLate: data.commandKeywordNegLate,
      commandKeywordNegNight: data.commandKeywordNegNight,
    }));
    svc.nightRate = data.nightRate;
    svc.holidayRate = data.holidayRate;
    svc.saRate = data.saRate;
    svc.soRate = data.soRate;
    svc.settingsChangeTrigger.update(v => v + 1);
  }
}

function buildWeekendDays(data: SchedulingDefaultsFormModel): string[] {
  const days: string[] = [];
  if (data.weekendMonday) days.push('Monday');
  if (data.weekendTuesday) days.push('Tuesday');
  if (data.weekendWednesday) days.push('Wednesday');
  if (data.weekendThursday) days.push('Thursday');
  if (data.weekendFriday) days.push('Friday');
  if (data.weekendSaturday) days.push('Saturday');
  if (data.weekendSunday) days.push('Sunday');
  return days;
}
