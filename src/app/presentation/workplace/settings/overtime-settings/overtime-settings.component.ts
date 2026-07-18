// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for overtime tier configuration (basis, rate mode and three overtime tiers)
 * with a settings tab (form) and a help tab (localized manual).
 * Bridges the raw fraction rates stored in the service (0.25) to the percentage values (25)
 * shown to the admin by multiplying by 100 on load and dividing by 100 on sync.
 * @param dataManagementSettingsService - Provides the overtimeSettings signal and the settings change trigger
 * @param activeTab - Currently visible card tab ('settings' form or 'manual' help).
 * @param manualContent - Localized help HTML rendered in the manual tab.
 */

import {
  Component, ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import {
  OvertimeBasis,
  OvertimeRateMode,
} from 'src/app/domain/models/settings/app-settings.model';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

const PERCENTAGE_FACTOR = 100;
const OVERTIME_MANUAL_NAME = 'overtime-manual';

interface OvertimeSettingsFormModel {
  overtimeBasis: OvertimeBasis;
  overtimeRateMode: OvertimeRateMode;
  overtimeTier1AfterHours: number | null;
  overtimeTier1Rate: number | null;
  overtimeTier2AfterHours: number | null;
  overtimeTier2Rate: number | null;
  overtimeTier3AfterHours: number | null;
  overtimeTier3Rate: number | null;
}

@Component({
  selector: 'app-overtime-settings',
  templateUrl: './overtime-settings.component.html',
  styleUrls: ['./overtime-settings.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OvertimeSettingsComponent implements OnInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);
  private destroyRef = inject(DestroyRef);

  public isDataLoaded = false;

  public activeTab = signal<'settings' | 'manual'>('settings');
  public manualContent = signal('');

  public formModel = signal<OvertimeSettingsFormModel>({
    overtimeBasis: 'day',
    overtimeRateMode: 'multiplier',
    overtimeTier1AfterHours: null,
    overtimeTier1Rate: null,
    overtimeTier2AfterHours: null,
    overtimeTier2Rate: null,
    overtimeTier3AfterHours: null,
    overtimeTier3Rate: null,
  });

  overtimeForm = form(this.formModel);

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

    this.loadManual();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadManual());
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    this.manualLoader.loadManual(OVERTIME_MANUAL_NAME, lang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(content => this.manualContent.set(content));
  }

  private loadFromService(): void {
    const svc = this.dataManagementSettingsService;
    const overtime = svc.appSettings.overtimeSettings();
    this.formModel.set({
      overtimeBasis: overtime.overtimeBasis,
      overtimeRateMode: overtime.overtimeRateMode,
      overtimeTier1AfterHours: overtime.overtimeTier1AfterHours,
      overtimeTier1Rate:
        overtime.overtimeTier1Rate === null
          ? null
          : overtime.overtimeTier1Rate * PERCENTAGE_FACTOR,
      overtimeTier2AfterHours: overtime.overtimeTier2AfterHours,
      overtimeTier2Rate:
        overtime.overtimeTier2Rate === null
          ? null
          : overtime.overtimeTier2Rate * PERCENTAGE_FACTOR,
      overtimeTier3AfterHours: overtime.overtimeTier3AfterHours,
      overtimeTier3Rate:
        overtime.overtimeTier3Rate === null
          ? null
          : overtime.overtimeTier3Rate * PERCENTAGE_FACTOR,
    });
  }

  private syncToService(data: OvertimeSettingsFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.appSettings.overtimeSettings.update(s => ({
      ...s,
      overtimeBasis: data.overtimeBasis,
      overtimeRateMode: data.overtimeRateMode,
      overtimeTier1AfterHours: data.overtimeTier1AfterHours,
      overtimeTier1Rate:
        data.overtimeTier1Rate === null
          ? null
          : data.overtimeTier1Rate / PERCENTAGE_FACTOR,
      overtimeTier2AfterHours: data.overtimeTier2AfterHours,
      overtimeTier2Rate:
        data.overtimeTier2Rate === null
          ? null
          : data.overtimeTier2Rate / PERCENTAGE_FACTOR,
      overtimeTier3AfterHours: data.overtimeTier3AfterHours,
      overtimeTier3Rate:
        data.overtimeTier3Rate === null
          ? null
          : data.overtimeTier3Rate / PERCENTAGE_FACTOR,
    }));
    svc.settingsChangeTrigger.update(v => v + 1);
  }
}
