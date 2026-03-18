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
  AppContactSettings,
  EmailServerSettings,
  ImapServerSettings,
  WorkSettings,
  SchedulingDefaultSettings
} from 'src/app/domain/models/settings/app-settings.model';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';

interface SettingsModels {
  contact: IAppContactSettings;
  email: IEmailServerSettings;
  imap: IImapServerSettings;
  work: IWorkSettings;
  schedulingDefaults: ISchedulingDefaultSettings;
  openRouteServiceApiKey: string;
  deeplApiKey: string;
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
  ]);

  public contactSettings = signal<IAppContactSettings>(new AppContactSettings());
  public emailSettings = signal<IEmailServerSettings>(new EmailServerSettings());
  public imapSettings = signal<IImapServerSettings>(new ImapServerSettings());
  public workSettings = signal<IWorkSettings>(new WorkSettings());
  public schedulingDefaultSettings = signal<ISchedulingDefaultSettings>(new SchedulingDefaultSettings());
  public openRouteServiceApiKey = signal<string>('');
  public deeplApiKey = signal<string>('');

  private contactSettingsOriginal = signal<IAppContactSettings>(new AppContactSettings());
  private emailSettingsOriginal = signal<IEmailServerSettings>(new EmailServerSettings());
  private imapSettingsOriginal = signal<IImapServerSettings>(new ImapServerSettings());
  private workSettingsOriginal = signal<IWorkSettings>(new WorkSettings());
  private schedulingDefaultSettingsOriginal = signal<ISchedulingDefaultSettings>(new SchedulingDefaultSettings());
  private openRouteServiceApiKeyOriginal = signal<string>('');
  private deeplApiKeyOriginal = signal<string>('');

  public isLoading = signal<boolean>(false);
  public isDirty = computed(() => this.checkIfDirty());

  private settingsList: ISetting[] = [];
  private saveCounter = 0;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.contactSettings();
      this.emailSettings();
      this.imapSettings();
      this.workSettings();
      this.schedulingDefaultSettings();
      this.openRouteServiceApiKey();
      this.deeplApiKey();

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
      openRouteServiceApiKey: '',
      deeplApiKey: '',
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
    this.openRouteServiceApiKey.set(models.openRouteServiceApiKey);
    this.deeplApiKey.set(models.deeplApiKey);

    this.contactSettingsOriginal.set(cloneObject(models.contact));
    this.emailSettingsOriginal.set(cloneObject(models.email));
    this.imapSettingsOriginal.set(cloneObject(models.imap));
    this.workSettingsOriginal.set(cloneObject(models.work));
    this.schedulingDefaultSettingsOriginal.set(cloneObject(models.schedulingDefaults));
    this.openRouteServiceApiKeyOriginal.set(models.openRouteServiceApiKey);
    this.deeplApiKeyOriginal.set(models.deeplApiKey);
  }

  save(): void {
    if (!this.isDirty()) {
      return;
    }

    const contact = this.contactSettings();
    const contactOriginal = this.contactSettingsOriginal();
    const email = this.emailSettings();
    const emailOriginal = this.emailSettingsOriginal();
    const work = this.workSettings();
    const workOriginal = this.workSettingsOriginal();

    // Save contact settings
    this.saveSetting(contact.name, contactOriginal.name, AppSetting.APP_NAME);
    this.saveSetting(contact.addressName, contactOriginal.addressName, AppSetting.APP_ADDRESS_NAME);
    this.saveSetting(contact.supplementAddress, contactOriginal.supplementAddress, AppSetting.APP_ADDRESS_SUPPLEMENT);
    this.saveSetting(contact.address, contactOriginal.address, AppSetting.APP_ADDRESS_ADDRESS);
    this.saveSetting(contact.zip, contactOriginal.zip, AppSetting.APP_ADDRESS_ZIP);
    this.saveSetting(contact.place, contactOriginal.place, AppSetting.APP_ADDRESS_PLACE);
    this.saveSetting(contact.state, contactOriginal.state, AppSetting.APP_ADDRESS_STATE);
    this.saveSetting(contact.country, contactOriginal.country, AppSetting.APP_ADDRESS_COUNTRY);
    this.saveSetting(contact.phone, contactOriginal.phone, AppSetting.APP_ADDRESS_PHONE);
    this.saveSetting(contact.email, contactOriginal.email, AppSetting.APP_ADDRESS_MAIL);
    this.saveSetting(contact.accountingStart.toString(), contactOriginal.accountingStart.toString(), AppSetting.APP_ACCOUNTING_START);
    this.saveSetting(contact.mark, contactOriginal.mark, AppSetting.APP_MARK);
    this.saveSetting(contact.globalCalendarCountry, contactOriginal.globalCalendarCountry, AppSetting.GLOBAL_CALENDAR_COUNTRY);
    this.saveSetting(contact.globalCalendarState, contactOriginal.globalCalendarState, AppSetting.GLOBAL_CALENDAR_STATE);
    this.saveSetting(contact.globalCalendarSelectionId, contactOriginal.globalCalendarSelectionId, AppSetting.GLOBAL_CALENDAR_SELECTION_ID);

    // Save email settings
    this.saveSetting(email.outgoingServer, emailOriginal.outgoingServer, AppSetting.APP_OUTGOING_SERVER);
    this.saveSetting(email.outgoingServerPort, emailOriginal.outgoingServerPort, AppSetting.APP_OUTGOING_SERVER_PORT);
    this.saveSetting(email.enabledSSL, emailOriginal.enabledSSL, AppSetting.APP_ENABLE_SSL);
    this.saveSetting(email.outgoingServerTimeout, emailOriginal.outgoingServerTimeout, AppSetting.APP_OUTGOING_SERVER_TIMEOUT);
    this.saveSetting(email.authenticationType, emailOriginal.authenticationType, AppSetting.APP_AUTHENTICATION_TYPE);
    this.saveSetting(email.readReceipt, emailOriginal.readReceipt, AppSetting.APP_READ_RECEIPT);
    this.saveSetting(email.replyTo, emailOriginal.replyTo, AppSetting.APP_REPLY_TO);
    this.saveSetting(email.dispositionNotification, emailOriginal.dispositionNotification, AppSetting.APP_DISPOSITION_NOTIFICATION);
    this.saveSetting(email.username, emailOriginal.username, AppSetting.APP_OUTGOING_SERVER_USERNAME);
    this.saveSetting(email.password, emailOriginal.password, AppSetting.APP_OUTGOING_SERVER_PASSWORD);

    const imap = this.imapSettings();
    const imapOriginal = this.imapSettingsOriginal();
    this.saveSetting(imap.server, imapOriginal.server, AppSetting.APP_INCOMING_SERVER);
    this.saveSetting(imap.port, imapOriginal.port, AppSetting.APP_INCOMING_SERVER_PORT);
    this.saveSetting(imap.username, imapOriginal.username, AppSetting.APP_INCOMING_SERVER_USERNAME);
    this.saveSetting(imap.password, imapOriginal.password, AppSetting.APP_INCOMING_SERVER_PASSWORD);
    this.saveSetting(imap.enableSSL, imapOriginal.enableSSL, AppSetting.APP_INCOMING_SERVER_SSL);
    this.saveSetting(imap.folder, imapOriginal.folder, AppSetting.APP_INCOMING_SERVER_FOLDER);
    this.saveSetting(imap.pollInterval, imapOriginal.pollInterval, AppSetting.APP_INCOMING_SERVER_POLL_INTERVAL);

    // Save work settings
    this.saveSetting(work.vacationDaysPerYear.toString(), workOriginal.vacationDaysPerYear.toString(), AppSetting.WORK_VACATION_DAYS_PER_YEAR);
    this.saveSetting(work.probationPeriod.toString(), workOriginal.probationPeriod.toString(), AppSetting.WORK_PROBATION_PERIOD);
    this.saveSetting(work.noticePeriod.toString(), workOriginal.noticePeriod.toString(), AppSetting.WORK_NOTICE_PERIOD);
    this.saveSetting(work.paymentInterval.toString(), workOriginal.paymentInterval.toString(), AppSetting.WORK_PAYMENT_INTERVAL);
    this.saveSetting(work.nightRate.toString(), workOriginal.nightRate.toString(), AppSetting.WORK_NIGHT_RATE);
    this.saveSetting(work.holidayRate.toString(), workOriginal.holidayRate.toString(), AppSetting.WORK_HOLIDAY_RATE);
    this.saveSetting(work.saRate.toString(), workOriginal.saRate.toString(), AppSetting.WORK_SA_RATE);
    this.saveSetting(work.soRate.toString(), workOriginal.soRate.toString(), AppSetting.WORK_SO_RATE);
    this.saveSetting(work.dayVisibleBefore.toString(), workOriginal.dayVisibleBefore.toString(), AppSetting.WORK_DAY_VISIBLE_BEFORE);
    this.saveSetting(work.dayVisibleAfter.toString(), workOriginal.dayVisibleAfter.toString(), AppSetting.WORK_DAY_VISIBLE_AFTER);

    // Save scheduling default settings
    const sched = this.schedulingDefaultSettings();
    const schedOriginal = this.schedulingDefaultSettingsOriginal();
    this.saveSetting(sched.defaultWorkingHours.toString(), schedOriginal.defaultWorkingHours.toString(), AppSetting.WORK_DEFAULT_WORKING_HOURS);
    this.saveSetting(sched.overtimeThreshold.toString(), schedOriginal.overtimeThreshold.toString(), AppSetting.WORK_OVERTIME_THRESHOLD);
    this.saveSetting(sched.guaranteedHours.toString(), schedOriginal.guaranteedHours.toString(), AppSetting.WORK_GUARANTEED_HOURS);
    this.saveSetting(sched.maximumHours.toString(), schedOriginal.maximumHours.toString(), AppSetting.WORK_MAXIMUM_HOURS);
    this.saveSetting(sched.minimumHours.toString(), schedOriginal.minimumHours.toString(), AppSetting.WORK_MINIMUM_HOURS);
    this.saveSetting(sched.fullTime.toString(), schedOriginal.fullTime.toString(), AppSetting.WORK_FULL_TIME);
    this.saveSetting(sched.schedulingMaxWorkDays.toString(), schedOriginal.schedulingMaxWorkDays.toString(), AppSetting.SCHEDULING_MAX_WORK_DAYS);
    this.saveSetting(sched.schedulingMinRestDays.toString(), schedOriginal.schedulingMinRestDays.toString(), AppSetting.SCHEDULING_MIN_REST_DAYS);
    this.saveSetting(sched.schedulingMinPauseHours.toString(), schedOriginal.schedulingMinPauseHours.toString(), AppSetting.SCHEDULING_MIN_PAUSE_HOURS);
    this.saveSetting(sched.schedulingMaxOptimalGap.toString(), schedOriginal.schedulingMaxOptimalGap.toString(), AppSetting.SCHEDULING_MAX_OPTIMAL_GAP);
    this.saveSetting(sched.schedulingMaxDailyHours.toString(), schedOriginal.schedulingMaxDailyHours.toString(), AppSetting.SCHEDULING_MAX_DAILY_HOURS);
    this.saveSetting(sched.schedulingMaxWeeklyHours.toString(), schedOriginal.schedulingMaxWeeklyHours.toString(), AppSetting.SCHEDULING_MAX_WEEKLY_HOURS);
    this.saveSetting(sched.schedulingMaxConsecutiveDays.toString(), schedOriginal.schedulingMaxConsecutiveDays.toString(), AppSetting.SCHEDULING_MAX_CONSECUTIVE_DAYS);

    // Save OpenRouteService API Key
    this.saveSetting(this.openRouteServiceApiKey(), this.openRouteServiceApiKeyOriginal(), AppSetting.OPENROUTESERVICE_API_KEY);

    // Save DeepL API Key
    this.saveSetting(this.deeplApiKey(), this.deeplApiKeyOriginal(), AppSetting.DEEPL_API_KEY);
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
      this.contactSettingsOriginal.set(cloneObject(this.contactSettings()));
      this.emailSettingsOriginal.set(cloneObject(this.emailSettings()));
      this.imapSettingsOriginal.set(cloneObject(this.imapSettings()));
      this.workSettingsOriginal.set(cloneObject(this.workSettings()));
      this.schedulingDefaultSettingsOriginal.set(cloneObject(this.schedulingDefaultSettings()));
      this.openRouteServiceApiKeyOriginal.set(this.openRouteServiceApiKey());
      this.deeplApiKeyOriginal.set(this.deeplApiKey());
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

    return (
      !compareComplexObjects(contact, contactOriginal) ||
      !compareComplexObjects(email, emailOriginal) ||
      !compareComplexObjects(imap, imapOriginal) ||
      !compareComplexObjects(work, workOriginal) ||
      !compareComplexObjects(sched, schedOriginal) ||
      this.openRouteServiceApiKey() !== this.openRouteServiceApiKeyOriginal() ||
      this.deeplApiKey() !== this.deeplApiKeyOriginal()
    );
  }

  resetData(): void {
    this.loadSettings();
  }
}
