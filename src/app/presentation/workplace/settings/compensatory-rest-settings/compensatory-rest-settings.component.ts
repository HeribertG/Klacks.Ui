// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for compensatory rest (Ersatzruhe) compliance defaults with a
 * settings tab (form) and a help tab (localized manual).
 * @param formModel - Local signal holding the editable compensatory rest values
 * (compensatoryRestEnabled, compensatoryRestDeadlineDays)
 * that are loaded from and synced back to the shared app settings store.
 * @param activeTab - Currently visible card tab ('settings' form or 'manual' help).
 * @param manualContent - Localized help HTML rendered in the manual tab.
 */

import {
  Component,
  ChangeDetectionStrategy,
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

const COMPENSATORY_REST_MANUAL_NAME = 'compensatory-rest-manual';

interface CompensatoryRestFormModel {
  compensatoryRestEnabled: boolean;
  compensatoryRestDeadlineDays: number;
}

@Component({
  selector: 'app-compensatory-rest-settings',
  templateUrl: './compensatory-rest-settings.component.html',
  styleUrls: ['./compensatory-rest-settings.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompensatoryRestSettingsComponent implements OnInit {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);
  private destroyRef = inject(DestroyRef);

  public isDataLoaded = false;

  public activeTab = signal<'settings' | 'manual'>('settings');
  public manualContent = signal('');

  public formModel = signal<CompensatoryRestFormModel>({
    compensatoryRestEnabled: false,
    compensatoryRestDeadlineDays: 0,
  });

  compensatoryRestForm = form(this.formModel);

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
    this.manualLoader.loadManual(COMPENSATORY_REST_MANUAL_NAME, lang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(content => this.manualContent.set(content));
  }

  private loadFromService(): void {
    const svc = this.dataManagementSettingsService;
    const rest = svc.appSettings.compensatoryRestSettings();
    this.formModel.set({
      compensatoryRestEnabled: rest.compensatoryRestEnabled,
      compensatoryRestDeadlineDays: rest.compensatoryRestDeadlineDays,
    });
  }

  private syncToService(data: CompensatoryRestFormModel): void {
    const svc = this.dataManagementSettingsService;
    svc.appSettings.compensatoryRestSettings.update(s => ({
      ...s,
      compensatoryRestEnabled: data.compensatoryRestEnabled,
      compensatoryRestDeadlineDays: this.normalizeDeadlineDays(data.compensatoryRestDeadlineDays),
    }));
    svc.settingsChangeTrigger.update(v => v + 1);
  }

  private normalizeDeadlineDays(value: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
}
