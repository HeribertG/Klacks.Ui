// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for surcharge modes, per-type fixed minimums, the WE3 rate and the night window.
 * Reads and writes the surchargeModeSettings signal on the app settings management service.
 * @remarks we3Rate is held as a fraction in the service and shown as a percentage (x100 on load, /100 on sync).
 * @remarks the five *MinimumPerHour fields are nullable and passed through untouched (empty input = null).
 */

import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import {
  SurchargeRateMode,
  SurchargeStackingMode,
} from 'src/app/domain/models/settings/app-settings.model';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

const PERCENTAGE_FACTOR = 100;
const SURCHARGE_MODE_MANUAL_NAME = 'surcharge-mode-manual';

type SettingsTab = 'settings' | 'manual';

interface SurchargeModeFormModel {
  we3Rate: number;
  nightRateMode: SurchargeRateMode;
  holidayRateMode: SurchargeRateMode;
  we1RateMode: SurchargeRateMode;
  we2RateMode: SurchargeRateMode;
  we3RateMode: SurchargeRateMode;
  nightMinimumPerHour: number | null;
  holidayMinimumPerHour: number | null;
  we1MinimumPerHour: number | null;
  we2MinimumPerHour: number | null;
  we3MinimumPerHour: number | null;
  nightStart: string;
  nightEnd: string;
  stackingMode: SurchargeStackingMode;
}

@Component({
  selector: 'app-surcharge-mode-settings',
  templateUrl: './surcharge-mode-settings.component.html',
  styleUrls: ['./surcharge-mode-settings.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurchargeModeSettingsComponent implements OnInit, OnDestroy {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);

  private destroy$ = new Subject<void>();

  public isDataLoaded = false;

  public readonly activeTab = signal<SettingsTab>('settings');
  public readonly manualContent = signal<string>('');

  public formModel = signal<SurchargeModeFormModel>({
    we3Rate: 0,
    nightRateMode: 'multiplier',
    holidayRateMode: 'multiplier',
    we1RateMode: 'multiplier',
    we2RateMode: 'multiplier',
    we3RateMode: 'multiplier',
    nightMinimumPerHour: null,
    holidayMinimumPerHour: null,
    we1MinimumPerHour: null,
    we2MinimumPerHour: null,
    we3MinimumPerHour: null,
    nightStart: '23:00',
    nightEnd: '06:00',
    stackingMode: 'highestwins',
  });

  surchargeForm = form(this.formModel);

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
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadManual());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    this.manualLoader
      .loadManual(SURCHARGE_MODE_MANUAL_NAME, lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }

  private loadFromService(): void {
    const svc = this.dataManagementSettingsService;
    const surcharge = svc.appSettings.surchargeModeSettings();
    this.formModel.set({
      we3Rate: surcharge.we3Rate * PERCENTAGE_FACTOR,
      nightRateMode: surcharge.nightRateMode,
      holidayRateMode: surcharge.holidayRateMode,
      we1RateMode: surcharge.we1RateMode,
      we2RateMode: surcharge.we2RateMode,
      we3RateMode: surcharge.we3RateMode,
      nightMinimumPerHour: surcharge.nightMinimumPerHour,
      holidayMinimumPerHour: surcharge.holidayMinimumPerHour,
      we1MinimumPerHour: surcharge.we1MinimumPerHour,
      we2MinimumPerHour: surcharge.we2MinimumPerHour,
      we3MinimumPerHour: surcharge.we3MinimumPerHour,
      nightStart: surcharge.nightStart,
      nightEnd: surcharge.nightEnd,
      stackingMode: surcharge.stackingMode,
    });
  }

  private syncToService(data: SurchargeModeFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.appSettings.surchargeModeSettings.update(s => ({
      ...s,
      we3Rate: data.we3Rate / PERCENTAGE_FACTOR,
      nightRateMode: data.nightRateMode,
      holidayRateMode: data.holidayRateMode,
      we1RateMode: data.we1RateMode,
      we2RateMode: data.we2RateMode,
      we3RateMode: data.we3RateMode,
      nightMinimumPerHour: data.nightMinimumPerHour,
      holidayMinimumPerHour: data.holidayMinimumPerHour,
      we1MinimumPerHour: data.we1MinimumPerHour,
      we2MinimumPerHour: data.we2MinimumPerHour,
      we3MinimumPerHour: data.we3MinimumPerHour,
      nightStart: data.nightStart,
      nightEnd: data.nightEnd,
      stackingMode: data.stackingMode,
    }));
    svc.settingsChangeTrigger.update(v => v + 1);
  }
}
