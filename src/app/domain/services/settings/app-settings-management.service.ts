// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Central store for all key-value application settings persisted through the generic
 * GeneralSettings endpoint. Loads the flat setting list into strongly typed sub-group
 * signals (contact, email, imap, work, scheduling defaults, compensatory rest,
 * surcharge modes, overtime, compliance enforcement, etc.), tracks dirtiness against an
 * original snapshot, and debounces an auto-save that writes only changed keys. Parsing,
 * serialization and comparison of the groups live in the app-settings-* domain helpers.
 * saveImmediately always resolves once every request of the save has settled; if one of them
 * failed, the error is logged and the original snapshot is kept so the settings stay dirty and
 * the next save sends them again.
 */

import { Injectable, inject, signal, computed, effect, DestroyRef, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, firstValueFrom } from 'rxjs';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { SettingsListReaderService } from 'src/app/domain/services/settings/settings-list-reader.service';
import { Setting } from 'src/app/domain/models/settings/settings-various-class';
import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { EmailTestResult } from 'src/app/domain/interfaces/email-test-result.interface';
import { EmailTestConfig } from 'src/app/domain/interfaces/email-test-config.interface';
import { ImapTestRequest } from 'src/app/domain/interfaces/imap-test-request.interface';
import { AppContactSettings } from 'src/app/domain/models/settings/app-settings.model';
import { IAppContactSettings } from 'src/app/domain/models/settings/app-contact-settings.interface';
import { IEmailServerSettings } from 'src/app/domain/models/settings/email-server-settings.interface';
import { IImapServerSettings } from 'src/app/domain/models/settings/imap-server-settings.interface';
import { IWorkSettings } from 'src/app/domain/models/settings/work-settings.interface';
import { ISchedulingDefaultSettings } from 'src/app/domain/models/settings/scheduling-default-settings.interface';
import { IDataRetentionSettings } from 'src/app/domain/models/settings/data-retention-settings.interface';
import { ICompensatoryRestSettings } from 'src/app/domain/models/settings/compensatory-rest-settings.interface';
import { ISurchargeModeSettings } from 'src/app/domain/models/settings/surcharge-mode-settings.interface';
import { IOvertimeSettings } from 'src/app/domain/models/settings/overtime-settings.interface';
import {
  IComplianceEnforcementSettings,
} from 'src/app/domain/models/settings/compliance-enforcement-settings.interface';
import { IActiveIndustriesSettings } from 'src/app/domain/models/settings/active-industries-settings.interface';
import { EmailServerSettings } from 'src/app/domain/models/settings/email-server-settings.model';
import { ImapServerSettings } from 'src/app/domain/models/settings/imap-server-settings.model';
import { WorkSettings } from 'src/app/domain/models/settings/work-settings.model';
import { SchedulingDefaultSettings } from 'src/app/domain/models/settings/scheduling-default-settings.model';
import { DataRetentionSettings } from 'src/app/domain/models/settings/data-retention-settings.model';
import { CompensatoryRestSettings } from 'src/app/domain/models/settings/compensatory-rest-settings.model';
import { SurchargeModeSettings } from 'src/app/domain/models/settings/surcharge-mode-settings.model';
import { OvertimeSettings } from 'src/app/domain/models/settings/overtime-settings.model';
import { ComplianceEnforcementSettings } from 'src/app/domain/models/settings/compliance-enforcement-settings.model';
import { ActiveIndustriesSettings } from 'src/app/domain/models/settings/active-industries-settings.model';
import { UpdateConfigSettings } from 'src/app/domain/models/settings/update-config-settings.model';
import { IUpdateConfigSettings } from 'src/app/domain/models/settings/update-config-settings.interface';
import { SpeechSettings } from 'src/app/domain/models/settings/speech-settings.model';
import { ISpeechSettings } from 'src/app/domain/models/settings/speech-settings.interface';
import { HolisticHarmonizerSettings } from 'src/app/domain/models/settings/holistic-harmonizer-settings.model';
import { IHolisticHarmonizerSettings } from 'src/app/domain/models/settings/holistic-harmonizer-settings.interface';
import { ErpImportScheduleDefaults } from 'src/app/domain/constants/erp-import-schedule.constants';
import { SettingsModels } from 'src/app/domain/models/settings/settings-models.interface';
import { cloneObject } from 'src/app/domain/helpers/object.helper';
import { areSettingsModelsEqual, createDefaultSettingsModels } from 'src/app/domain/helpers/app-settings-models.helper';
import { parseSettingsModels } from 'src/app/domain/helpers/app-settings-parsing.helper';
import { APP_SETTING_SERIALIZERS } from 'src/app/domain/helpers/app-settings-serialization.helper';

const SAVE_SETTING_FAILED_MESSAGE = 'Failed to save app setting:';
const AUTO_SAVE_DELAY_MS = 1500;

@Injectable({
  providedIn: 'root',
})
export class AppSettingsManagementService {
  private dataSettingsService = inject(DataSettingsVariousService);
  private settingsListReader = inject(SettingsListReaderService);
  private destroyRef = inject(DestroyRef);

  public contactSettings = signal<IAppContactSettings>(new AppContactSettings());
  public emailSettings = signal<IEmailServerSettings>(new EmailServerSettings());
  public imapSettings = signal<IImapServerSettings>(new ImapServerSettings());
  public workSettings = signal<IWorkSettings>(new WorkSettings());
  public schedulingDefaultSettings = signal<ISchedulingDefaultSettings>(new SchedulingDefaultSettings());
  public dataRetentionSettings = signal<IDataRetentionSettings>(new DataRetentionSettings());
  public updateConfigSettings = signal<IUpdateConfigSettings>(new UpdateConfigSettings());
  public openRouteServiceApiKey = signal<string>('');
  public deeplApiKey = signal<string>('');
  public webSearchProvider = signal<string>('');
  public webSearchApiKey = signal<string>('');
  public webSearchMaxResults = signal<string>('');
  public erpImportCronExpression = signal<string>(ErpImportScheduleDefaults.CronExpression);
  public erpImportCronTimeZone = signal<string>(ErpImportScheduleDefaults.UseCompanyTimeZone);
  public speechSettings = signal<ISpeechSettings>(new SpeechSettings());
  public holisticHarmonizerSettings = signal<IHolisticHarmonizerSettings>(new HolisticHarmonizerSettings());
  public compensatoryRestSettings = signal<ICompensatoryRestSettings>(new CompensatoryRestSettings());
  public surchargeModeSettings = signal<ISurchargeModeSettings>(new SurchargeModeSettings());
  public overtimeSettings = signal<IOvertimeSettings>(new OvertimeSettings());
  public complianceEnforcementSettings = signal<IComplianceEnforcementSettings>(new ComplianceEnforcementSettings());
  public activeIndustriesSettings = signal<IActiveIndustriesSettings>(new ActiveIndustriesSettings());

  private originalModels = signal<SettingsModels>(createDefaultSettingsModels());

  public isLoading = signal<boolean>(false);
  public isDirty = computed(() => !areSettingsModelsEqual(this.currentModels(), this.originalModels()));

  private settingsList: ISetting[] = [];
  private saveCounter = 0;
  private saveFailed = false;
  private saveCompletionResolvers: (() => void)[] = [];
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.currentModels();

      untracked(() => {
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(() => {
          if (this.isDirty()) {
            this.save();
          }
        }, AUTO_SAVE_DELAY_MS);
      });
    });

    this.destroyRef.onDestroy(() => {
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }
    });
  }

  loadSettings(): void {
    this.isLoading.set(true);

    this.settingsListReader
      .readSettingList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          if (settings) {
            this.settingsList = settings as ISetting[];
            this.applySettingsToModels(settings as ISetting[]);
          }
        },
        error: (error) => {
          console.error('Failed to load app settings:', error);
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
  }

  async loadSettingsAsync(): Promise<void> {
    try {
      const settings = await firstValueFrom(this.settingsListReader.readSettingList());
      if (settings) {
        this.settingsList = settings as ISetting[];
        this.applySettingsToModels(settings as ISetting[]);
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  }

  private applySettingsToModels(settings: ISetting[]): void {
    const models = parseSettingsModels(settings);

    this.contactSettings.set(models.contact);
    this.emailSettings.set(models.email);
    this.imapSettings.set(models.imap);
    this.workSettings.set(models.work);
    this.schedulingDefaultSettings.set(models.schedulingDefaults);
    this.dataRetentionSettings.set(models.dataRetention);
    this.updateConfigSettings.set(models.update);
    this.openRouteServiceApiKey.set(models.openRouteServiceApiKey);
    this.deeplApiKey.set(models.deeplApiKey);
    this.webSearchProvider.set(models.webSearchProvider);
    this.webSearchApiKey.set(models.webSearchApiKey);
    this.webSearchMaxResults.set(models.webSearchMaxResults);
    this.erpImportCronExpression.set(models.erpImportCronExpression);
    this.erpImportCronTimeZone.set(models.erpImportCronTimeZone);
    this.speechSettings.set(models.speech);
    this.holisticHarmonizerSettings.set(models.holisticHarmonizer);
    this.compensatoryRestSettings.set(models.compensatoryRest);
    this.surchargeModeSettings.set(models.surchargeMode);
    this.overtimeSettings.set(models.overtime);
    this.complianceEnforcementSettings.set(models.complianceEnforcement);
    this.activeIndustriesSettings.set(models.activeIndustries);

    this.originalModels.set(cloneObject(models));
  }

  private currentModels(): SettingsModels {
    return {
      contact: this.contactSettings(),
      email: this.emailSettings(),
      imap: this.imapSettings(),
      work: this.workSettings(),
      schedulingDefaults: this.schedulingDefaultSettings(),
      dataRetention: this.dataRetentionSettings(),
      update: this.updateConfigSettings(),
      openRouteServiceApiKey: this.openRouteServiceApiKey(),
      deeplApiKey: this.deeplApiKey(),
      webSearchProvider: this.webSearchProvider(),
      webSearchApiKey: this.webSearchApiKey(),
      webSearchMaxResults: this.webSearchMaxResults(),
      erpImportCronExpression: this.erpImportCronExpression(),
      erpImportCronTimeZone: this.erpImportCronTimeZone(),
      speech: this.speechSettings(),
      holisticHarmonizer: this.holisticHarmonizerSettings(),
      compensatoryRest: this.compensatoryRestSettings(),
      surchargeMode: this.surchargeModeSettings(),
      overtime: this.overtimeSettings(),
      complianceEnforcement: this.complianceEnforcementSettings(),
      activeIndustries: this.activeIndustriesSettings(),
    };
  }

  save(): void {
    if (!this.isDirty()) {
      return;
    }

    for (const serializer of APP_SETTING_SERIALIZERS) {
      this.saveSetting(
        serializer.serialize(this.currentModels()),
        serializer.serialize(this.originalModels()),
        serializer.key
      );
    }
  }

  async saveImmediately(): Promise<void> {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.save();
    if (this.saveCounter === 0) {
      return;
    }
    await new Promise<void>((resolve) => this.saveCompletionResolvers.push(resolve));
  }

  testEmailConfiguration(config: EmailTestConfig): Observable<EmailTestResult> {
    return this.dataSettingsService.testEmailConfiguration(config);
  }

  testImapConfiguration(config: ImapTestRequest): Observable<EmailTestResult> {
    return this.dataSettingsService.testImapConfiguration(config);
  }

  private saveSetting(value: string, originalValue: string, type: string): void {
    if (value === originalValue) {
      return;
    }

    const existingSetting = this.settingsList.find((x) => x.type === type);

    if (existingSetting) {
      this.saveCounter++;
      existingSetting.value = value;
      this.dataSettingsService
        .updateSetting(existingSetting)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.completeSaveRequest(),
          error: (error: unknown) => this.failSaveRequest(error),
        });
    } else {
      const newSetting = new Setting();
      newSetting.value = value;
      newSetting.type = type;
      this.saveCounter++;
      this.dataSettingsService
        .addSetting(newSetting)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (savedSetting) => {
            this.settingsList.push(savedSetting);
            this.completeSaveRequest();
          },
          error: (error: unknown) => this.failSaveRequest(error),
        });
    }
  }

  private completeSaveRequest(): void {
    this.saveCounter--;
    this.checkSaveComplete();
  }

  private failSaveRequest(error: unknown): void {
    console.error(SAVE_SETTING_FAILED_MESSAGE, error);
    this.saveFailed = true;
    this.saveCounter--;
    this.checkSaveComplete();
  }

  private checkSaveComplete(): void {
    if (this.saveCounter !== 0) {
      return;
    }

    const resolvers = this.saveCompletionResolvers;
    this.saveCompletionResolvers = [];
    const failed = this.saveFailed;
    this.saveFailed = false;

    if (!failed) {
      this.snapshotOriginals();
    }
    resolvers.forEach((resolve) => resolve());
  }

  private snapshotOriginals(): void {
    this.originalModels.set(cloneObject(this.currentModels()));
  }

  resetData(): void {
    this.loadSettings();
  }
}
