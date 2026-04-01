// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for configuring the GDPR data retention period.
 * @param dataRetentionDays - Number of days after which soft-deleted records are permanently removed
 */
import {
  Component, ChangeDetectionStrategy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';

const MIN_RETENTION_DAYS = 30;
const MAX_RETENTION_DAYS = 36500;
const DAYS_PER_MONTH = 30.44;
const MONTHS_PER_YEAR = 12;

interface DataRetentionFormModel {
  dataRetentionDays: number;
}

@Component({
  selector: 'app-data-retention-setting',
  templateUrl: './data-retention-setting.component.html',
  styleUrls: ['./data-retention-setting.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataRetentionSettingComponent implements OnInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private translateService = inject(TranslateService);

  public isDataLoaded = false;

  public formModel = signal<DataRetentionFormModel>({
    dataRetentionDays: 3650,
  });

  retentionForm = form(this.formModel);

  public retentionDisplay = computed(() => {
    const days = this.formModel().dataRetentionDays;
    const totalMonths = Math.round(days / DAYS_PER_MONTH);
    const years = Math.floor(totalMonths / MONTHS_PER_YEAR);
    const months = totalMonths % MONTHS_PER_YEAR;
    const t = this.translateService;

    const parts: string[] = [];
    if (years > 0) {
      const key = years === 1 ? 'settings.data-retention.year' : 'settings.data-retention.years';
      parts.push(`${years} ${t.instant(key)}`);
    }
    if (months > 0) {
      const key = months === 1 ? 'settings.data-retention.month' : 'settings.data-retention.months';
      parts.push(`${months} ${t.instant(key)}`);
    }
    return parts.length > 0 ? `≈ ${parts.join(', ')}` : '';
  });

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
      const clamped = Math.max(MIN_RETENTION_DAYS, Math.min(MAX_RETENTION_DAYS, data.dataRetentionDays));

      if (clamped !== data.dataRetentionDays) {
        this.formModel.update(m => ({ ...m, dataRetentionDays: clamped }));
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
    const retention = this.dataManagementSettingsService.appSettings.dataRetentionSettings();
    this.formModel.set({
      dataRetentionDays: retention.dataRetentionDays,
    });
  }

  private syncToService(data: DataRetentionFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.appSettings.dataRetentionSettings.update(s => ({
      ...s,
      dataRetentionDays: data.dataRetentionDays,
    }));
    svc.settingsChangeTrigger.update(v => v + 1);
  }
}
