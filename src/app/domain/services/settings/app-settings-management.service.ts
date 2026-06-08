// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, signal, computed, effect, DestroyRef, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ISetting, Setting, AppSetting } from 'src/app/domain/models/settings/settings-various-class';
import {
  IAppContactSettings,
  IEmailServerSettings,
  IImapServerSettings,
  IWorkSettings,
  ISchedulingDefaultSettings,
  IDataRetentionSettings,
  AppContactSettings,
  EmailServerSettings,
  ImapServerSettings,
  WorkSettings,
  SchedulingDefaultSettings,
  DataRetentionSettings
} from 'src/app/domain/models/settings/app-settings.model';
import { IUpdateConfigSettings, UpdateConfigSettings } from 'src/app/domain/models/settings/update-config-settings.model';
import { ISpeechSettings, SpeechSettings } from 'src/app/domain/models/settings/speech-settings.model';
import { SttEngine } from 'src/app/domain/constants/speech-constants';
import { IHolisticHarmonizerSettings, HolisticHarmonizerSettings } from 'src/app/domain/models/settings/holistic-harmonizer-settings.model';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';

interface SettingsModels {
  contact: IAppContactSettings;
  email: IEmailServerSettings;
  imap: IImapServerSettings;
  work: IWorkSettings;
  schedulingDefaults: ISchedulingDefaultSettings;
  dataRetention: IDataRetentionSettings;
  update: IUpdateConfigSettings;
  openRouteServiceApiKey: string;
  deeplApiKey: string;
  speech: ISpeechSettings;
  holisticHarmonizer: IHolisticHarmonizerSettings;
}

@Injectable({
  providedIn: 'root',
})
export class AppSettingsManagementService {
  private dataSettingsService = inject(DataSettingsVariousService);
  private destroyRef = inject(DestroyRef);

  private readonly settingsHandlerMap = new Map<string, (value: string, models: SettingsModels) => void>([
    [AppSetting.APP_NAME, (v, m) => (m.contact.name = v)],
    [AppSetting.APP_ADDRESS_NAME, (v, m) => (m.contact.addressName = v)],
    [AppSetting.APP_ADDRESS_SUPPLEMENT, (v, m) => (m.contact.supplementAddress = v)],
    [AppSetting.APP_ADDRESS_ADDRESS, (v, m) => (m.contact.address = v)],
    [AppSetting.APP_ADDRESS_ZIP, (v, m) => (m.contact.zip = v)],
    [AppSetting.APP_ADDRESS_PLACE, (v, m) => (m.contact.place = v)],
    [AppSetting.APP_ADDRESS_STATE, (v, m) => (m.contact.state = v)],
    [AppSetting.APP_ADDRESS_COUNTRY, (v, m) => (m.contact.country = v)],
    [AppSetting.APP_ADDRESS_PHONE, (v, m) => (m.contact.phone = v)],
    [AppSetting.APP_ADDRESS_MAIL, (v, m) => (m.contact.email = v)],
    [AppSetting.APP_ACCOUNTING_START, (v, m) => (m.contact.accountingStart = +v)],
    [AppSetting.APP_MARK, (v, m) => (m.contact.mark = v)],
    [AppSetting.GLOBAL_CALENDAR_COUNTRY, (v, m) => (m.contact.globalCalendarCountry = v)],
    [AppSetting.GLOBAL_CALENDAR_STATE, (v, m) => (m.contact.globalCalendarState = v)],
    [AppSetting.GLOBAL_CALENDAR_SELECTION_ID, (v, m) => (m.contact.globalCalendarSelectionId = v)],

    [AppSetting.APP_OUTGOING_SERVER, (v, m) => (m.email.outgoingServer = v)],
    [AppSetting.APP_OUTGOING_SERVER_PORT, (v, m) => (m.email.outgoingServerPort = v)],
    [AppSetting.APP_ENABLE_SSL, (v, m) => (m.email.enabledSSL = v)],
    [AppSetting.APP_OUTGOING_SERVER_TIMEOUT, (v, m) => (m.email.outgoingServerTimeout = v)],
    [AppSetting.APP_AUTHENTICATION_TYPE, (v, m) => (m.email.authenticationType = v)],
    [AppSetting.APP_READ_RECEIPT, (v, m) => (m.email.readReceipt = v)],
    [AppSetting.APP_REPLY_TO, (v, m) => (m.email.replyTo = v)],
    [AppSetting.APP_DISPOSITION_NOTIFICATION, (v, m) => (m.email.dispositionNotification = v)],
    [AppSetting.APP_OUTGOING_SERVER_USERNAME, (v, m) => (m.email.username = v)],
    [AppSetting.APP_OUTGOING_SERVER_PASSWORD, (v, m) => (m.email.password = v)],

    [AppSetting.APP_INCOMING_SERVER, (v, m) => (m.imap.server = v)],
    [AppSetting.APP_INCOMING_SERVER_PORT, (v, m) => (m.imap.port = v)],
    [AppSetting.APP_INCOMING_SERVER_USERNAME, (v, m) => (m.imap.username = v)],
    [AppSetting.APP_INCOMING_SERVER_PASSWORD, (v, m) => (m.imap.password = v)],
    [AppSetting.APP_INCOMING_SERVER_SSL, (v, m) => (m.imap.enableSSL = v)],
    [AppSetting.APP_INCOMING_SERVER_FOLDER, (v, m) => (m.imap.folder = v)],
    [AppSetting.APP_INCOMING_SERVER_POLL_INTERVAL, (v, m) => (m.imap.pollInterval = v)],

    [AppSetting.OPENROUTESERVICE_API_KEY, (v, m) => (m.openRouteServiceApiKey = v)],
    [AppSetting.DEEPL_API_KEY, (v, m) => (m.deeplApiKey = v)],

    [AppSetting.WORK_VACATION_DAYS_PER_YEAR, (v, m) => (m.work.vacationDaysPerYear = parseInt(v, 10) || 25)],
    [AppSetting.WORK_PROBATION_PERIOD, (v, m) => (m.work.probationPeriod = parseInt(v, 10) || 3)],
    [AppSetting.WORK_NOTICE_PERIOD, (v, m) => (m.work.noticePeriod = parseInt(v, 10) || 30)],
    [AppSetting.WORK_PAYMENT_INTERVAL, (v, m) => {
      const parsed = parseInt(v, 10);
      m.work.paymentInterval = Number.isNaN(parsed) ? 2 : parsed;
    }],
    [AppSetting.WORK_NIGHT_RATE, (v, m) => (m.work.nightRate = parseFloat(v) || 0)],
    [AppSetting.WORK_HOLIDAY_RATE, (v, m) => (m.work.holidayRate = parseFloat(v) || 0)],
    [AppSetting.WORK_SA_RATE, (v, m) => (m.work.saRate = parseFloat(v) || 0)],
    [AppSetting.WORK_SO_RATE, (v, m) => (m.work.soRate = parseFloat(v) || 0)],
    [AppSetting.WORK_DAY_VISIBLE_BEFORE, (v, m) => {
      const parsed = parseInt(v, 10);
      m.work.dayVisibleBefore = Number.isNaN(parsed) ? 3 : parsed;
    }],
    [AppSetting.WORK_DAY_VISIBLE_AFTER, (v, m) => {
      const parsed = parseInt(v, 10);
      m.work.dayVisibleAfter = Number.isNaN(parsed) ? 3 : parsed;
    }],

    [AppSetting.WORK_DEFAULT_WORKING_HOURS, (v, m) => (m.schedulingDefaults.defaultWorkingHours = parseFloat(v) || 8.5)],
    [AppSetting.WORK_OVERTIME_THRESHOLD, (v, m) => (m.schedulingDefaults.overtimeThreshold = parseFloat(v) || 42)],
    [AppSetting.WORK_GUARANTEED_HOURS, (v, m) => (m.schedulingDefaults.guaranteedHours = parseFloat(v) || 0)],
    [AppSetting.WORK_MAXIMUM_HOURS, (v, m) => (m.schedulingDefaults.maximumHours = parseFloat(v) || 0)],
    [AppSetting.WORK_MINIMUM_HOURS, (v, m) => (m.schedulingDefaults.minimumHours = parseFloat(v) || 0)],
    [AppSetting.WORK_FULL_TIME, (v, m) => (m.schedulingDefaults.fullTime = parseFloat(v) || 0)],
    [AppSetting.SCHEDULING_MAX_WORK_DAYS, (v, m) => (m.schedulingDefaults.schedulingMaxWorkDays = parseInt(v, 10) || 5)],
    [AppSetting.SCHEDULING_MIN_REST_DAYS, (v, m) => (m.schedulingDefaults.schedulingMinRestDays = parseInt(v, 10) || 2)],
    [AppSetting.SCHEDULING_MIN_PAUSE_HOURS, (v, m) => (m.schedulingDefaults.schedulingMinPauseHours = parseFloat(v) || 12)],
    [AppSetting.SCHEDULING_MAX_OPTIMAL_GAP, (v, m) => (m.schedulingDefaults.schedulingMaxOptimalGap = parseFloat(v) || 2)],
    [AppSetting.SCHEDULING_MAX_DAILY_HOURS, (v, m) => (m.schedulingDefaults.schedulingMaxDailyHours = parseFloat(v) || 10)],
    [AppSetting.SCHEDULING_MAX_WEEKLY_HOURS, (v, m) => (m.schedulingDefaults.schedulingMaxWeeklyHours = parseFloat(v) || 50)],
    [AppSetting.SCHEDULING_MAX_CONSECUTIVE_DAYS, (v, m) => (m.schedulingDefaults.schedulingMaxConsecutiveDays = parseInt(v, 10) || 6)],

    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_MONDAY, (v, m) => (m.schedulingDefaults.workOnMonday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_TUESDAY, (v, m) => (m.schedulingDefaults.workOnTuesday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_WEDNESDAY, (v, m) => (m.schedulingDefaults.workOnWednesday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_THURSDAY, (v, m) => (m.schedulingDefaults.workOnThursday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_FRIDAY, (v, m) => (m.schedulingDefaults.workOnFriday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_SATURDAY, (v, m) => (m.schedulingDefaults.workOnSaturday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_WORK_ON_SUNDAY, (v, m) => (m.schedulingDefaults.workOnSunday = v === 'true')],
    [AppSetting.SCHEDULING_DEFAULT_PERFORMS_SHIFT_WORK, (v, m) => (m.schedulingDefaults.performsShiftWork = v === 'true')],

    [AppSetting.SCHEDULE_COMMAND_KEYWORD_FREE, (v, m) => (m.schedulingDefaults.commandKeywordFree = v || 'FREE')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_EARLY, (v, m) => (m.schedulingDefaults.commandKeywordEarly = v || 'EARLY')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_LATE, (v, m) => (m.schedulingDefaults.commandKeywordLate = v || 'LATE')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NIGHT, (v, m) => (m.schedulingDefaults.commandKeywordNight = v || 'NIGHT')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_FREE, (v, m) => (m.schedulingDefaults.commandKeywordNegFree = v || '-FREE')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_EARLY, (v, m) => (m.schedulingDefaults.commandKeywordNegEarly = v || '-EARLY')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_LATE, (v, m) => (m.schedulingDefaults.commandKeywordNegLate = v || '-LATE')],
    [AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_NIGHT, (v, m) => (m.schedulingDefaults.commandKeywordNegNight = v || '-NIGHT')],

    [AppSetting.DATA_RETENTION_DAYS, (v, m) => (m.dataRetention.dataRetentionDays = parseInt(v, 10) || 3650)],

    [AppSetting.ASSISTANT_STT_ENGINE, (v, m) => (m.speech.sttEngine = v)],
    [AppSetting.ASSISTANT_STT_API_KEY_DEEPGRAM, (v, m) => (m.speech.sttApiKeys[SttEngine.Deepgram] = v)],
    [AppSetting.ASSISTANT_STT_API_KEY_GROQ, (v, m) => (m.speech.sttApiKeys[SttEngine.GroqWhisper] = v)],
    [AppSetting.ASSISTANT_STT_API_KEY_ASSEMBLYAI, (v, m) => (m.speech.sttApiKeys[SttEngine.AssemblyAi] = v)],
    [AppSetting.ASSISTANT_TTS_VOICE, (v, m) => (m.speech.ttsVoice = v)],
    [AppSetting.ASSISTANT_TTS_PROVIDER, (v, m) => (m.speech.ttsProvider = v)],
    [AppSetting.ASSISTANT_TRANSCRIPTION_MODEL, (v, m) => (m.speech.transcriptionModel = v)],
    [AppSetting.ASSISTANT_TRANSCRIPTION_PROMPT, (v, m) => (m.speech.transcriptionPrompt = v)],
    [AppSetting.ASSISTANT_ENHANCEMENT_ENABLED, (v, m) => (m.speech.enhancementEnabled = v === 'true')],
    [AppSetting.ASSISTANT_OUTPUT_MODE, (v, m) => (m.speech.outputMode = v)],
    [AppSetting.ASSISTANT_SILENCE_THRESHOLD_MS, (v, m) => (m.speech.silenceThresholdMs = parseInt(v, 10) || 1500)],

    [AppSetting.HOLISTIC_HARMONIZER_LLM_MODEL, (v, m) => (m.holisticHarmonizer.llmModelId = v)],

    [AppSetting.UPDATE_AUTO_ENABLED, (v, m) => (m.update.autoEnabled = (v ?? '').toLowerCase() === 'true')],
    [AppSetting.UPDATE_CHANNEL, (v, m) => (m.update.channel = v || 'Stable')],
    [AppSetting.UPDATE_CHECK_INTERVAL_HOURS, (v, m) => (m.update.checkIntervalHours = parseInt(v, 10) || 6)],
    [AppSetting.UPDATE_MAINTENANCE_WINDOW_START, (v, m) => (m.update.maintenanceWindowStart = v || '')],
    [AppSetting.UPDATE_MAINTENANCE_WINDOW_END, (v, m) => (m.update.maintenanceWindowEnd = v || '')],
    [AppSetting.UPDATE_NOTIFY_ONLY, (v, m) => (m.update.notifyOnly = (v ?? '').toLowerCase() === 'true')],
    [AppSetting.UPDATE_BACKUP_RETENTION_COUNT, (v, m) => (m.update.backupRetentionCount = parseInt(v, 10) || 3)],
    [AppSetting.UPDATE_PINNED_VERSION, (v, m) => (m.update.pinnedVersion = v || '')],
  ]);

  public contactSettings = signal<IAppContactSettings>(new AppContactSettings());
  public emailSettings = signal<IEmailServerSettings>(new EmailServerSettings());
  public imapSettings = signal<IImapServerSettings>(new ImapServerSettings());
  public workSettings = signal<IWorkSettings>(new WorkSettings());
  public schedulingDefaultSettings = signal<ISchedulingDefaultSettings>(new SchedulingDefaultSettings());
  public dataRetentionSettings = signal<IDataRetentionSettings>(new DataRetentionSettings());
  public updateConfigSettings = signal<IUpdateConfigSettings>(new UpdateConfigSettings());
  public openRouteServiceApiKey = signal<string>('');
  public deeplApiKey = signal<string>('');
  public speechSettings = signal<ISpeechSettings>(new SpeechSettings());
  public holisticHarmonizerSettings = signal<IHolisticHarmonizerSettings>(new HolisticHarmonizerSettings());

  private contactSettingsOriginal = signal<IAppContactSettings>(new AppContactSettings());
  private emailSettingsOriginal = signal<IEmailServerSettings>(new EmailServerSettings());
  private imapSettingsOriginal = signal<IImapServerSettings>(new ImapServerSettings());
  private workSettingsOriginal = signal<IWorkSettings>(new WorkSettings());
  private schedulingDefaultSettingsOriginal = signal<ISchedulingDefaultSettings>(new SchedulingDefaultSettings());
  private dataRetentionSettingsOriginal = signal<IDataRetentionSettings>(new DataRetentionSettings());
  private updateConfigSettingsOriginal = signal<IUpdateConfigSettings>(new UpdateConfigSettings());
  private openRouteServiceApiKeyOriginal = signal<string>('');
  private deeplApiKeyOriginal = signal<string>('');
  private speechSettingsOriginal = signal<ISpeechSettings>(new SpeechSettings());
  private holisticHarmonizerSettingsOriginal = signal<IHolisticHarmonizerSettings>(new HolisticHarmonizerSettings());

  public isLoading = signal<boolean>(false);
  public isDirty = computed(() => this.checkIfDirty());

  private settingsList: ISetting[] = [];
  private saveCounter = 0;
  private saveCompletionResolvers: (() => void)[] = [];
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.contactSettings();
      this.emailSettings();
      this.imapSettings();
      this.workSettings();
      this.schedulingDefaultSettings();
      this.dataRetentionSettings();
      this.updateConfigSettings();
      this.openRouteServiceApiKey();
      this.deeplApiKey();
      this.speechSettings();
      this.holisticHarmonizerSettings();

      untracked(() => {
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(() => {
          if (this.isDirty()) {
            this.save();
          }
        }, 1500);
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

    this.dataSettingsService
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
    const settings = await firstValueFrom(this.dataSettingsService.readSettingList());
    if (settings) {
      this.settingsList = settings as ISetting[];
      this.applySettingsToModels(settings as ISetting[]);
    }
  }

  private applySettingsToModels(settings: ISetting[]): void {
    const models: SettingsModels = {
      contact: new AppContactSettings(),
      email: new EmailServerSettings(),
      imap: new ImapServerSettings(),
      work: new WorkSettings(),
      schedulingDefaults: new SchedulingDefaultSettings(),
      dataRetention: new DataRetentionSettings(),
      update: new UpdateConfigSettings(),
      openRouteServiceApiKey: '',
      deeplApiKey: '',
      speech: new SpeechSettings(),
      holisticHarmonizer: new HolisticHarmonizerSettings(),
    };

    for (const setting of settings) {
      const handler = this.settingsHandlerMap.get(setting.type);
      if (handler) {
        handler(setting.value, models);
      }
    }

    this.contactSettings.set(models.contact);
    this.emailSettings.set(models.email);
    this.imapSettings.set(models.imap);
    this.workSettings.set(models.work);
    this.schedulingDefaultSettings.set(models.schedulingDefaults);
    this.dataRetentionSettings.set(models.dataRetention);
    this.updateConfigSettings.set(models.update);
    this.openRouteServiceApiKey.set(models.openRouteServiceApiKey);
    this.deeplApiKey.set(models.deeplApiKey);
    this.speechSettings.set(models.speech);
    this.holisticHarmonizerSettings.set(models.holisticHarmonizer);

    this.contactSettingsOriginal.set(cloneObject(models.contact));
    this.emailSettingsOriginal.set(cloneObject(models.email));
    this.imapSettingsOriginal.set(cloneObject(models.imap));
    this.workSettingsOriginal.set(cloneObject(models.work));
    this.schedulingDefaultSettingsOriginal.set(cloneObject(models.schedulingDefaults));
    this.dataRetentionSettingsOriginal.set(cloneObject(models.dataRetention));
    this.updateConfigSettingsOriginal.set(cloneObject(models.update));
    this.openRouteServiceApiKeyOriginal.set(models.openRouteServiceApiKey);
    this.deeplApiKeyOriginal.set(models.deeplApiKey);
    this.speechSettingsOriginal.set(cloneObject(models.speech));
    this.holisticHarmonizerSettingsOriginal.set(cloneObject(models.holisticHarmonizer));
  }

  private readonly saveDefinitions: readonly { key: string; getCurrent: () => string; getOriginal: () => string }[] = [
    { key: AppSetting.APP_NAME, getCurrent: () => this.contactSettings().name, getOriginal: () => this.contactSettingsOriginal().name },
    { key: AppSetting.APP_ADDRESS_NAME, getCurrent: () => this.contactSettings().addressName, getOriginal: () => this.contactSettingsOriginal().addressName },
    { key: AppSetting.APP_ADDRESS_SUPPLEMENT, getCurrent: () => this.contactSettings().supplementAddress, getOriginal: () => this.contactSettingsOriginal().supplementAddress },
    { key: AppSetting.APP_ADDRESS_ADDRESS, getCurrent: () => this.contactSettings().address, getOriginal: () => this.contactSettingsOriginal().address },
    { key: AppSetting.APP_ADDRESS_ZIP, getCurrent: () => this.contactSettings().zip, getOriginal: () => this.contactSettingsOriginal().zip },
    { key: AppSetting.APP_ADDRESS_PLACE, getCurrent: () => this.contactSettings().place, getOriginal: () => this.contactSettingsOriginal().place },
    { key: AppSetting.APP_ADDRESS_STATE, getCurrent: () => this.contactSettings().state, getOriginal: () => this.contactSettingsOriginal().state },
    { key: AppSetting.APP_ADDRESS_COUNTRY, getCurrent: () => this.contactSettings().country, getOriginal: () => this.contactSettingsOriginal().country },
    { key: AppSetting.APP_ADDRESS_PHONE, getCurrent: () => this.contactSettings().phone, getOriginal: () => this.contactSettingsOriginal().phone },
    { key: AppSetting.APP_ADDRESS_MAIL, getCurrent: () => this.contactSettings().email, getOriginal: () => this.contactSettingsOriginal().email },
    { key: AppSetting.APP_ACCOUNTING_START, getCurrent: () => this.contactSettings().accountingStart.toString(), getOriginal: () => this.contactSettingsOriginal().accountingStart.toString() },
    { key: AppSetting.APP_MARK, getCurrent: () => this.contactSettings().mark, getOriginal: () => this.contactSettingsOriginal().mark },
    { key: AppSetting.GLOBAL_CALENDAR_COUNTRY, getCurrent: () => this.contactSettings().globalCalendarCountry, getOriginal: () => this.contactSettingsOriginal().globalCalendarCountry },
    { key: AppSetting.GLOBAL_CALENDAR_STATE, getCurrent: () => this.contactSettings().globalCalendarState, getOriginal: () => this.contactSettingsOriginal().globalCalendarState },
    { key: AppSetting.GLOBAL_CALENDAR_SELECTION_ID, getCurrent: () => this.contactSettings().globalCalendarSelectionId, getOriginal: () => this.contactSettingsOriginal().globalCalendarSelectionId },

    { key: AppSetting.APP_OUTGOING_SERVER, getCurrent: () => this.emailSettings().outgoingServer, getOriginal: () => this.emailSettingsOriginal().outgoingServer },
    { key: AppSetting.APP_OUTGOING_SERVER_PORT, getCurrent: () => this.emailSettings().outgoingServerPort, getOriginal: () => this.emailSettingsOriginal().outgoingServerPort },
    { key: AppSetting.APP_ENABLE_SSL, getCurrent: () => this.emailSettings().enabledSSL, getOriginal: () => this.emailSettingsOriginal().enabledSSL },
    { key: AppSetting.APP_OUTGOING_SERVER_TIMEOUT, getCurrent: () => this.emailSettings().outgoingServerTimeout, getOriginal: () => this.emailSettingsOriginal().outgoingServerTimeout },
    { key: AppSetting.APP_AUTHENTICATION_TYPE, getCurrent: () => this.emailSettings().authenticationType, getOriginal: () => this.emailSettingsOriginal().authenticationType },
    { key: AppSetting.APP_READ_RECEIPT, getCurrent: () => this.emailSettings().readReceipt, getOriginal: () => this.emailSettingsOriginal().readReceipt },
    { key: AppSetting.APP_REPLY_TO, getCurrent: () => this.emailSettings().replyTo, getOriginal: () => this.emailSettingsOriginal().replyTo },
    { key: AppSetting.APP_DISPOSITION_NOTIFICATION, getCurrent: () => this.emailSettings().dispositionNotification, getOriginal: () => this.emailSettingsOriginal().dispositionNotification },
    { key: AppSetting.APP_OUTGOING_SERVER_USERNAME, getCurrent: () => this.emailSettings().username, getOriginal: () => this.emailSettingsOriginal().username },
    { key: AppSetting.APP_OUTGOING_SERVER_PASSWORD, getCurrent: () => this.emailSettings().password, getOriginal: () => this.emailSettingsOriginal().password },

    { key: AppSetting.APP_INCOMING_SERVER, getCurrent: () => this.imapSettings().server, getOriginal: () => this.imapSettingsOriginal().server },
    { key: AppSetting.APP_INCOMING_SERVER_PORT, getCurrent: () => this.imapSettings().port, getOriginal: () => this.imapSettingsOriginal().port },
    { key: AppSetting.APP_INCOMING_SERVER_USERNAME, getCurrent: () => this.imapSettings().username, getOriginal: () => this.imapSettingsOriginal().username },
    { key: AppSetting.APP_INCOMING_SERVER_PASSWORD, getCurrent: () => this.imapSettings().password, getOriginal: () => this.imapSettingsOriginal().password },
    { key: AppSetting.APP_INCOMING_SERVER_SSL, getCurrent: () => this.imapSettings().enableSSL, getOriginal: () => this.imapSettingsOriginal().enableSSL },
    { key: AppSetting.APP_INCOMING_SERVER_FOLDER, getCurrent: () => this.imapSettings().folder, getOriginal: () => this.imapSettingsOriginal().folder },
    { key: AppSetting.APP_INCOMING_SERVER_POLL_INTERVAL, getCurrent: () => this.imapSettings().pollInterval, getOriginal: () => this.imapSettingsOriginal().pollInterval },

    { key: AppSetting.WORK_VACATION_DAYS_PER_YEAR, getCurrent: () => this.workSettings().vacationDaysPerYear.toString(), getOriginal: () => this.workSettingsOriginal().vacationDaysPerYear.toString() },
    { key: AppSetting.WORK_PROBATION_PERIOD, getCurrent: () => this.workSettings().probationPeriod.toString(), getOriginal: () => this.workSettingsOriginal().probationPeriod.toString() },
    { key: AppSetting.WORK_NOTICE_PERIOD, getCurrent: () => this.workSettings().noticePeriod.toString(), getOriginal: () => this.workSettingsOriginal().noticePeriod.toString() },
    { key: AppSetting.WORK_PAYMENT_INTERVAL, getCurrent: () => this.workSettings().paymentInterval.toString(), getOriginal: () => this.workSettingsOriginal().paymentInterval.toString() },
    { key: AppSetting.WORK_NIGHT_RATE, getCurrent: () => this.workSettings().nightRate.toString(), getOriginal: () => this.workSettingsOriginal().nightRate.toString() },
    { key: AppSetting.WORK_HOLIDAY_RATE, getCurrent: () => this.workSettings().holidayRate.toString(), getOriginal: () => this.workSettingsOriginal().holidayRate.toString() },
    { key: AppSetting.WORK_SA_RATE, getCurrent: () => this.workSettings().saRate.toString(), getOriginal: () => this.workSettingsOriginal().saRate.toString() },
    { key: AppSetting.WORK_SO_RATE, getCurrent: () => this.workSettings().soRate.toString(), getOriginal: () => this.workSettingsOriginal().soRate.toString() },
    { key: AppSetting.WORK_DAY_VISIBLE_BEFORE, getCurrent: () => this.workSettings().dayVisibleBefore.toString(), getOriginal: () => this.workSettingsOriginal().dayVisibleBefore.toString() },
    { key: AppSetting.WORK_DAY_VISIBLE_AFTER, getCurrent: () => this.workSettings().dayVisibleAfter.toString(), getOriginal: () => this.workSettingsOriginal().dayVisibleAfter.toString() },

    { key: AppSetting.WORK_DEFAULT_WORKING_HOURS, getCurrent: () => this.schedulingDefaultSettings().defaultWorkingHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().defaultWorkingHours.toString() },
    { key: AppSetting.WORK_OVERTIME_THRESHOLD, getCurrent: () => this.schedulingDefaultSettings().overtimeThreshold.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().overtimeThreshold.toString() },
    { key: AppSetting.WORK_GUARANTEED_HOURS, getCurrent: () => this.schedulingDefaultSettings().guaranteedHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().guaranteedHours.toString() },
    { key: AppSetting.WORK_MAXIMUM_HOURS, getCurrent: () => this.schedulingDefaultSettings().maximumHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().maximumHours.toString() },
    { key: AppSetting.WORK_MINIMUM_HOURS, getCurrent: () => this.schedulingDefaultSettings().minimumHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().minimumHours.toString() },
    { key: AppSetting.WORK_FULL_TIME, getCurrent: () => this.schedulingDefaultSettings().fullTime.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().fullTime.toString() },
    { key: AppSetting.SCHEDULING_MAX_WORK_DAYS, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxWorkDays.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxWorkDays.toString() },
    { key: AppSetting.SCHEDULING_MIN_REST_DAYS, getCurrent: () => this.schedulingDefaultSettings().schedulingMinRestDays.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMinRestDays.toString() },
    { key: AppSetting.SCHEDULING_MIN_PAUSE_HOURS, getCurrent: () => this.schedulingDefaultSettings().schedulingMinPauseHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMinPauseHours.toString() },
    { key: AppSetting.SCHEDULING_MAX_OPTIMAL_GAP, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxOptimalGap.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxOptimalGap.toString() },
    { key: AppSetting.SCHEDULING_MAX_DAILY_HOURS, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxDailyHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxDailyHours.toString() },
    { key: AppSetting.SCHEDULING_MAX_WEEKLY_HOURS, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxWeeklyHours.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxWeeklyHours.toString() },
    { key: AppSetting.SCHEDULING_MAX_CONSECUTIVE_DAYS, getCurrent: () => this.schedulingDefaultSettings().schedulingMaxConsecutiveDays.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().schedulingMaxConsecutiveDays.toString() },

    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_MONDAY, getCurrent: () => this.schedulingDefaultSettings().workOnMonday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnMonday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_TUESDAY, getCurrent: () => this.schedulingDefaultSettings().workOnTuesday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnTuesday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_WEDNESDAY, getCurrent: () => this.schedulingDefaultSettings().workOnWednesday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnWednesday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_THURSDAY, getCurrent: () => this.schedulingDefaultSettings().workOnThursday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnThursday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_FRIDAY, getCurrent: () => this.schedulingDefaultSettings().workOnFriday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnFriday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_SATURDAY, getCurrent: () => this.schedulingDefaultSettings().workOnSaturday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnSaturday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_WORK_ON_SUNDAY, getCurrent: () => this.schedulingDefaultSettings().workOnSunday.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().workOnSunday.toString() },
    { key: AppSetting.SCHEDULING_DEFAULT_PERFORMS_SHIFT_WORK, getCurrent: () => this.schedulingDefaultSettings().performsShiftWork.toString(), getOriginal: () => this.schedulingDefaultSettingsOriginal().performsShiftWork.toString() },

    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_FREE, getCurrent: () => this.schedulingDefaultSettings().commandKeywordFree, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordFree },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_EARLY, getCurrent: () => this.schedulingDefaultSettings().commandKeywordEarly, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordEarly },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_LATE, getCurrent: () => this.schedulingDefaultSettings().commandKeywordLate, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordLate },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NIGHT, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNight, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNight },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_FREE, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNegFree, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNegFree },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_EARLY, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNegEarly, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNegEarly },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_LATE, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNegLate, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNegLate },
    { key: AppSetting.SCHEDULE_COMMAND_KEYWORD_NEG_NIGHT, getCurrent: () => this.schedulingDefaultSettings().commandKeywordNegNight, getOriginal: () => this.schedulingDefaultSettingsOriginal().commandKeywordNegNight },

    { key: AppSetting.DATA_RETENTION_DAYS, getCurrent: () => this.dataRetentionSettings().dataRetentionDays.toString(), getOriginal: () => this.dataRetentionSettingsOriginal().dataRetentionDays.toString() },

    { key: AppSetting.OPENROUTESERVICE_API_KEY, getCurrent: () => this.openRouteServiceApiKey(), getOriginal: () => this.openRouteServiceApiKeyOriginal() },
    { key: AppSetting.DEEPL_API_KEY, getCurrent: () => this.deeplApiKey(), getOriginal: () => this.deeplApiKeyOriginal() },

    { key: AppSetting.ASSISTANT_STT_ENGINE, getCurrent: () => this.speechSettings().sttEngine, getOriginal: () => this.speechSettingsOriginal().sttEngine },
    { key: AppSetting.ASSISTANT_STT_API_KEY_DEEPGRAM, getCurrent: () => this.speechSettings().sttApiKeys[SttEngine.Deepgram] ?? '', getOriginal: () => this.speechSettingsOriginal().sttApiKeys[SttEngine.Deepgram] ?? '' },
    { key: AppSetting.ASSISTANT_STT_API_KEY_GROQ, getCurrent: () => this.speechSettings().sttApiKeys[SttEngine.GroqWhisper] ?? '', getOriginal: () => this.speechSettingsOriginal().sttApiKeys[SttEngine.GroqWhisper] ?? '' },
    { key: AppSetting.ASSISTANT_STT_API_KEY_ASSEMBLYAI, getCurrent: () => this.speechSettings().sttApiKeys[SttEngine.AssemblyAi] ?? '', getOriginal: () => this.speechSettingsOriginal().sttApiKeys[SttEngine.AssemblyAi] ?? '' },
    { key: AppSetting.ASSISTANT_TTS_VOICE, getCurrent: () => this.speechSettings().ttsVoice, getOriginal: () => this.speechSettingsOriginal().ttsVoice },
    { key: AppSetting.ASSISTANT_TTS_PROVIDER, getCurrent: () => this.speechSettings().ttsProvider, getOriginal: () => this.speechSettingsOriginal().ttsProvider },
    { key: AppSetting.ASSISTANT_TRANSCRIPTION_MODEL, getCurrent: () => this.speechSettings().transcriptionModel, getOriginal: () => this.speechSettingsOriginal().transcriptionModel },
    { key: AppSetting.ASSISTANT_TRANSCRIPTION_PROMPT, getCurrent: () => this.speechSettings().transcriptionPrompt, getOriginal: () => this.speechSettingsOriginal().transcriptionPrompt },
    { key: AppSetting.ASSISTANT_ENHANCEMENT_ENABLED, getCurrent: () => String(this.speechSettings().enhancementEnabled), getOriginal: () => String(this.speechSettingsOriginal().enhancementEnabled) },
    { key: AppSetting.ASSISTANT_OUTPUT_MODE, getCurrent: () => this.speechSettings().outputMode, getOriginal: () => this.speechSettingsOriginal().outputMode },
    { key: AppSetting.ASSISTANT_SILENCE_THRESHOLD_MS, getCurrent: () => String(this.speechSettings().silenceThresholdMs), getOriginal: () => String(this.speechSettingsOriginal().silenceThresholdMs) },

    { key: AppSetting.HOLISTIC_HARMONIZER_LLM_MODEL, getCurrent: () => this.holisticHarmonizerSettings().llmModelId, getOriginal: () => this.holisticHarmonizerSettingsOriginal().llmModelId },

    { key: AppSetting.UPDATE_AUTO_ENABLED, getCurrent: () => String(this.updateConfigSettings().autoEnabled), getOriginal: () => String(this.updateConfigSettingsOriginal().autoEnabled) },
    { key: AppSetting.UPDATE_CHANNEL, getCurrent: () => this.updateConfigSettings().channel, getOriginal: () => this.updateConfigSettingsOriginal().channel },
    { key: AppSetting.UPDATE_CHECK_INTERVAL_HOURS, getCurrent: () => this.updateConfigSettings().checkIntervalHours.toString(), getOriginal: () => this.updateConfigSettingsOriginal().checkIntervalHours.toString() },
    { key: AppSetting.UPDATE_MAINTENANCE_WINDOW_START, getCurrent: () => this.updateConfigSettings().maintenanceWindowStart, getOriginal: () => this.updateConfigSettingsOriginal().maintenanceWindowStart },
    { key: AppSetting.UPDATE_MAINTENANCE_WINDOW_END, getCurrent: () => this.updateConfigSettings().maintenanceWindowEnd, getOriginal: () => this.updateConfigSettingsOriginal().maintenanceWindowEnd },
    { key: AppSetting.UPDATE_NOTIFY_ONLY, getCurrent: () => String(this.updateConfigSettings().notifyOnly), getOriginal: () => String(this.updateConfigSettingsOriginal().notifyOnly) },
    { key: AppSetting.UPDATE_BACKUP_RETENTION_COUNT, getCurrent: () => this.updateConfigSettings().backupRetentionCount.toString(), getOriginal: () => this.updateConfigSettingsOriginal().backupRetentionCount.toString() },
    { key: AppSetting.UPDATE_PINNED_VERSION, getCurrent: () => this.updateConfigSettings().pinnedVersion, getOriginal: () => this.updateConfigSettingsOriginal().pinnedVersion },
  ];

  save(): void {
    if (!this.isDirty()) {
      return;
    }

    for (const definition of this.saveDefinitions) {
      this.saveSetting(definition.getCurrent(), definition.getOriginal(), definition.key);
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
        .subscribe(() => {
          this.saveCounter--;
          this.checkSaveComplete();
        });
    } else {
      const newSetting = new Setting();
      newSetting.value = value;
      newSetting.type = type;
      this.saveCounter++;
      this.dataSettingsService
        .addSetting(newSetting)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((savedSetting) => {
          this.settingsList.push(savedSetting);
          this.saveCounter--;
          this.checkSaveComplete();
        });
    }
  }

  private checkSaveComplete(): void {
    if (this.saveCounter === 0) {
      const resolvers = this.saveCompletionResolvers;
      this.saveCompletionResolvers = [];
      resolvers.forEach((resolve) => resolve());
      this.contactSettingsOriginal.set(cloneObject(this.contactSettings()));
      this.emailSettingsOriginal.set(cloneObject(this.emailSettings()));
      this.imapSettingsOriginal.set(cloneObject(this.imapSettings()));
      this.workSettingsOriginal.set(cloneObject(this.workSettings()));
      this.schedulingDefaultSettingsOriginal.set(cloneObject(this.schedulingDefaultSettings()));
      this.dataRetentionSettingsOriginal.set(cloneObject(this.dataRetentionSettings()));
      this.updateConfigSettingsOriginal.set(cloneObject(this.updateConfigSettings()));
      this.openRouteServiceApiKeyOriginal.set(this.openRouteServiceApiKey());
      this.deeplApiKeyOriginal.set(this.deeplApiKey());
      this.speechSettingsOriginal.set(cloneObject(this.speechSettings()));
      this.holisticHarmonizerSettingsOriginal.set(cloneObject(this.holisticHarmonizerSettings()));
    }
  }

  private checkIfDirty(): boolean {
    const contact = this.contactSettings();
    const contactOriginal = this.contactSettingsOriginal();
    const email = this.emailSettings();
    const emailOriginal = this.emailSettingsOriginal();
    const imap = this.imapSettings();
    const imapOriginal = this.imapSettingsOriginal();
    const work = this.workSettings();
    const workOriginal = this.workSettingsOriginal();
    const sched = this.schedulingDefaultSettings();
    const schedOriginal = this.schedulingDefaultSettingsOriginal();
    const retention = this.dataRetentionSettings();
    const retentionOriginal = this.dataRetentionSettingsOriginal();

    return (
      !compareComplexObjects(contact, contactOriginal) ||
      !compareComplexObjects(email, emailOriginal) ||
      !compareComplexObjects(imap, imapOriginal) ||
      !compareComplexObjects(work, workOriginal) ||
      !compareComplexObjects(sched, schedOriginal) ||
      !compareComplexObjects(retention, retentionOriginal) ||
      !compareComplexObjects(this.updateConfigSettings(), this.updateConfigSettingsOriginal()) ||
      this.openRouteServiceApiKey() !== this.openRouteServiceApiKeyOriginal() ||
      this.deeplApiKey() !== this.deeplApiKeyOriginal() ||
      !compareComplexObjects(this.speechSettings(), this.speechSettingsOriginal()) ||
      !compareComplexObjects(this.holisticHarmonizerSettings(), this.holisticHarmonizerSettingsOriginal())
    );
  }

  resetData(): void {
    this.loadSettings();
  }
}
