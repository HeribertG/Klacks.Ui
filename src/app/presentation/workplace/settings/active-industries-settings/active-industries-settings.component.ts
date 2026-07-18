// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for the ACTIVE_INDUSTRIES setting with a settings tab (five industry
 * checkboxes) and a help tab (localized manual). Only checked industries appear in
 * industry-preset selection lists; presets themselves are never deleted.
 * @param formModel - Local signal holding one checkbox state per canonical industry slug,
 * loaded from and synced back to the shared app settings store.
 * @param hasSelection - True while at least one industry is checked; an empty selection
 * blocks syncing and shows an inline validation hint instead.
 * @param activeTab - Currently visible card tab ('settings' form or 'manual' help).
 * @param manualContent - Localized help HTML rendered in the manual tab.
 */

import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
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
import { IndustrySlugs } from 'src/app/domain/constants/industry-slugs.constants';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

const ACTIVE_INDUSTRIES_MANUAL_NAME = 'active-industries-manual';

interface ActiveIndustriesFormModel {
  homecare: boolean;
  healthcare: boolean;
  security: boolean;
  facility: boolean;
  logistics: boolean;
}

@Component({
  selector: 'app-active-industries-settings',
  templateUrl: './active-industries-settings.component.html',
  styleUrls: ['./active-industries-settings.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveIndustriesSettingsComponent implements OnInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);
  private destroyRef = inject(DestroyRef);

  public isDataLoaded = false;

  public activeTab = signal<'settings' | 'manual'>('settings');
  public manualContent = signal('');

  public formModel = signal<ActiveIndustriesFormModel>({
    homecare: true,
    healthcare: true,
    security: true,
    facility: true,
    logistics: true,
  });

  industriesForm = form(this.formModel);

  public hasSelection = computed(() => this.selectedSlugs(this.formModel()).length > 0);

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
    this.manualLoader.loadManual(ACTIVE_INDUSTRIES_MANUAL_NAME, lang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(content => this.manualContent.set(content));
  }

  private loadFromService(): void {
    const svc = this.dataManagementSettingsService;
    const active = svc.appSettings.activeIndustriesSettings().activeIndustries;
    this.formModel.set({
      homecare: active.includes(IndustrySlugs.Homecare),
      healthcare: active.includes(IndustrySlugs.Healthcare),
      security: active.includes(IndustrySlugs.Security),
      facility: active.includes(IndustrySlugs.Facility),
      logistics: active.includes(IndustrySlugs.Logistics),
    });
  }

  private syncToService(data: ActiveIndustriesFormModel): void {
    const slugs = this.selectedSlugs(data);
    if (slugs.length === 0) {
      return;
    }

    const svc = this.dataManagementSettingsService;
    svc.appSettings.activeIndustriesSettings.update(s => ({
      ...s,
      activeIndustries: slugs,
    }));
    svc.settingsChangeTrigger.update(v => v + 1);
  }

  private selectedSlugs(data: ActiveIndustriesFormModel): string[] {
    const selection: [string, boolean][] = [
      [IndustrySlugs.Homecare, data.homecare],
      [IndustrySlugs.Healthcare, data.healthcare],
      [IndustrySlugs.Security, data.security],
      [IndustrySlugs.Facility, data.facility],
      [IndustrySlugs.Logistics, data.logistics],
    ];
    return selection.filter(([, checked]) => checked).map(([slug]) => slug);
  }
}
