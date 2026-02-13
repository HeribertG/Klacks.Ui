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
}

@Component({
  selector: 'app-scheduling-defaults-setting',
  templateUrl: './scheduling-defaults-setting.component.html',
  styleUrls: ['./scheduling-defaults-setting.component.scss'],
  standalone: true,
  imports: [FormsModule, Field, TranslateModule, NgbModule],
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
    this.formModel.set({
      defaultWorkingHours: svc.defaultWorkingHours,
      overtimeThreshold: svc.overtimeThreshold,
      guaranteedHours: svc.guaranteedHours,
      maximumHours: svc.maximumHours,
      minimumHours: svc.minimumHours,
      fullTime: svc.fullTime,
      schedulingMaxWorkDays: svc.schedulingMaxWorkDays,
      schedulingMinRestDays: svc.schedulingMinRestDays,
      schedulingMinPauseHours: svc.schedulingMinPauseHours,
      schedulingMaxOptimalGap: svc.schedulingMaxOptimalGap,
      schedulingMaxDailyHours: svc.schedulingMaxDailyHours,
      schedulingMaxWeeklyHours: svc.schedulingMaxWeeklyHours,
      schedulingMaxConsecutiveDays: svc.schedulingMaxConsecutiveDays,
    });
  }

  private syncToService(data: SchedulingDefaultsFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.defaultWorkingHours = data.defaultWorkingHours;
    svc.overtimeThreshold = data.overtimeThreshold;
    svc.guaranteedHours = data.guaranteedHours;
    svc.maximumHours = data.maximumHours;
    svc.minimumHours = data.minimumHours;
    svc.fullTime = data.fullTime;
    svc.schedulingMaxWorkDays = data.schedulingMaxWorkDays;
    svc.schedulingMinRestDays = data.schedulingMinRestDays;
    svc.schedulingMinPauseHours = data.schedulingMinPauseHours;
    svc.schedulingMaxOptimalGap = data.schedulingMaxOptimalGap;
    svc.schedulingMaxDailyHours = data.schedulingMaxDailyHours;
    svc.schedulingMaxWeeklyHours = data.schedulingMaxWeeklyHours;
    svc.schedulingMaxConsecutiveDays = data.schedulingMaxConsecutiveDays;
    svc.settingsChangeTrigger.update(v => v + 1);
  }
}
