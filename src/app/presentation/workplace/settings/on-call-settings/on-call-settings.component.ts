// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for on-call / standby (Pikett) work-time rules with a settings
 * tab (form) and a help tab (localized manual). Edits whether on-call is enabled
 * and how presence and standby time are counted (as a percentage 0-100) towards
 * working time and period caps.
 * @param dataManagementSettingsService - Facade exposing the on-call settings signal and change triggers.
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
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

const ON_CALL_MANUAL_NAME = 'on-call-manual';

interface OnCallFormModel {
  onCallEnabled: boolean;
  onCallPresenceCountsPercent: number;
  onCallStandbyCountsPercent: number;
  onCallIncludeInPeriodCaps: boolean;
}

const PERCENT_MIN = 0;
const PERCENT_MAX = 100;

@Component({
  selector: 'app-on-call-settings',
  templateUrl: './on-call-settings.component.html',
  styleUrls: ['./on-call-settings.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnCallSettingsComponent implements OnInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);
  private destroyRef = inject(DestroyRef);

  public isDataLoaded = false;

  public activeTab = signal<'settings' | 'manual'>('settings');
  public manualContent = signal('');

  public formModel = signal<OnCallFormModel>({
    onCallEnabled: false,
    onCallPresenceCountsPercent: 100,
    onCallStandbyCountsPercent: 0,
    onCallIncludeInPeriodCaps: false,
  });

  onCallForm = form(this.formModel);

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
    this.manualLoader.loadManual(ON_CALL_MANUAL_NAME, lang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(content => this.manualContent.set(content));
  }

  private loadFromService(): void {
    const svc = this.dataManagementSettingsService;
    const onCall = svc.appSettings.onCallSettings();
    this.formModel.set({
      onCallEnabled: onCall.onCallEnabled,
      onCallPresenceCountsPercent: onCall.onCallPresenceCountsPercent,
      onCallStandbyCountsPercent: onCall.onCallStandbyCountsPercent,
      onCallIncludeInPeriodCaps: onCall.onCallIncludeInPeriodCaps,
    });
  }

  private syncToService(data: OnCallFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.appSettings.onCallSettings.update(s => ({
      ...s,
      onCallEnabled: data.onCallEnabled,
      onCallPresenceCountsPercent: clampPercent(data.onCallPresenceCountsPercent),
      onCallStandbyCountsPercent: clampPercent(data.onCallStandbyCountsPercent),
      onCallIncludeInPeriodCaps: data.onCallIncludeInPeriodCaps,
    }));
    svc.settingsChangeTrigger.update(v => v + 1);
  }
}

function clampPercent(value: number): number {
  if (Number.isNaN(value)) {
    return PERCENT_MIN;
  }
  return Math.min(PERCENT_MAX, Math.max(PERCENT_MIN, value));
}
