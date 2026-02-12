import { Injectable, inject, signal, computed, effect, DestroyRef, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ISetting, Setting, AppSetting } from 'src/app/domain/models/settings/settings-various-class';
import {
  IAppContactSettings,
  IEmailServerSettings,
  IWorkSettings,
  AppContactSettings,
  EmailServerSettings,
  WorkSettings
} from 'src/app/domain/models/settings/app-settings.model';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';

@Injectable({
  providedIn: 'root',
})
export class AppSettingsManagementService {
  private dataSettingsService = inject(DataSettingsVariousService);
  private destroyRef = inject(DestroyRef);

  public contactSettings = signal<IAppContactSettings>(new AppContactSettings());
  public emailSettings = signal<IEmailServerSettings>(new EmailServerSettings());
  public workSettings = signal<IWorkSettings>(new WorkSettings());
  public openRouteServiceApiKey = signal<string>('');
  public deeplApiKey = signal<string>('');

  private contactSettingsOriginal = signal<IAppContactSettings>(new AppContactSettings());
  private emailSettingsOriginal = signal<IEmailServerSettings>(new EmailServerSettings());
  private workSettingsOriginal = signal<IWorkSettings>(new WorkSettings());
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
      this.workSettings();
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
    const contact = new AppContactSettings();
    const email = new EmailServerSettings();
    const work = new WorkSettings();
    let openRouteServiceApiKey = '';
    let deeplApiKey = '';

    settings.forEach((setting) => {
      switch (setting.type) {
        case AppSetting.APP_NAME:
          contact.name = setting.value;
          break;
        case AppSetting.APP_ADDRESS_NAME:
          contact.addressName = setting.value;
          break;
        case AppSetting.APP_ADDRESS_SUPPLEMENT:
          contact.supplementAddress = setting.value;
          break;
        case AppSetting.APP_ADDRESS_ADDRESS:
          contact.address = setting.value;
          break;
        case AppSetting.APP_ADDRESS_ZIP:
          contact.zip = setting.value;
          break;
        case AppSetting.APP_ADDRESS_PLACE:
          contact.place = setting.value;
          break;
        case AppSetting.APP_ADDRESS_STATE:
          contact.state = setting.value;
          break;
        case AppSetting.APP_ADDRESS_COUNTRY:
          contact.country = setting.value;
          break;
        case AppSetting.APP_ADDRESS_PHONE:
          contact.phone = setting.value;
          break;
        case AppSetting.APP_ADDRESS_MAIL:
          contact.email = setting.value;
          break;
        case AppSetting.APP_ACCOUNTING_START:
          contact.accountingStart = +setting.value;
          break;
        case AppSetting.APP_MARK:
          contact.mark = setting.value;
          break;
        case AppSetting.GLOBAL_CALENDAR_COUNTRY:
          contact.globalCalendarCountry = setting.value;
          break;
        case AppSetting.GLOBAL_CALENDAR_STATE:
          contact.globalCalendarState = setting.value;
          break;
        case AppSetting.GLOBAL_CALENDAR_SELECTION_ID:
          contact.globalCalendarSelectionId = setting.value;
          break;

        case AppSetting.APP_OUTGOING_SERVER:
          email.outgoingServer = setting.value;
          break;
        case AppSetting.APP_OUTGOING_SERVER_PORT:
          email.outgoingServerPort = setting.value;
          break;
        case AppSetting.APP_ENABLE_SSL:
          email.enabledSSL = setting.value;
          break;
        case AppSetting.APP_OUTGOING_SERVER_TIMEOUT:
          email.outgoingServerTimeout = setting.value;
          break;
        case AppSetting.APP_AUTHENTICATION_TYPE:
          email.authenticationType = setting.value;
          break;
        case AppSetting.APP_READ_RECEIPT:
          email.readReceipt = setting.value;
          break;
        case AppSetting.APP_REPLY_TO:
          email.replyTo = setting.value;
          break;
        case AppSetting.APP_DISPOSITION_NOTIFICATION:
          email.dispositionNotification = setting.value;
          break;
        case AppSetting.APP_OUTGOING_SERVER_USERNAME:
          email.username = setting.value;
          break;
        case AppSetting.APP_OUTGOING_SERVER_PASSWORD:
          email.password = setting.value;
          break;

        case AppSetting.OPENROUTESERVICE_API_KEY:
          openRouteServiceApiKey = setting.value;
          break;
        case AppSetting.DEEPL_API_KEY:
          deeplApiKey = setting.value;
          break;

        case AppSetting.WORK_DEFAULT_WORKING_HOURS:
          work.defaultWorkingHours = parseFloat(setting.value) || 8.5;
          break;
        case AppSetting.WORK_OVERTIME_THRESHOLD:
          work.overtimeThreshold = parseFloat(setting.value) || 42;
          break;
        case AppSetting.WORK_VACATION_DAYS_PER_YEAR:
          work.vacationDaysPerYear = parseInt(setting.value, 10) || 25;
          break;
        case AppSetting.WORK_PROBATION_PERIOD:
          work.probationPeriod = parseInt(setting.value, 10) || 3;
          break;
        case AppSetting.WORK_NOTICE_PERIOD:
          work.noticePeriod = parseInt(setting.value, 10) || 30;
          break;
        case AppSetting.WORK_PAYMENT_INTERVAL: {
          const paymentVal = parseInt(setting.value, 10);
          work.paymentInterval = Number.isNaN(paymentVal) ? 2 : paymentVal;
          break;
        }
        case AppSetting.WORK_GUARANTEED_HOURS:
          work.guaranteedHours = parseFloat(setting.value) || 0;
          break;
        case AppSetting.WORK_MAXIMUM_HOURS:
          work.maximumHours = parseFloat(setting.value) || 0;
          break;
        case AppSetting.WORK_MINIMUM_HOURS:
          work.minimumHours = parseFloat(setting.value) || 0;
          break;
        case AppSetting.WORK_FULL_TIME:
          work.fullTime = parseFloat(setting.value) || 0;
          break;
        case AppSetting.WORK_NIGHT_RATE:
          work.nightRate = parseFloat(setting.value) || 0;
          break;
        case AppSetting.WORK_HOLIDAY_RATE:
          work.holidayRate = parseFloat(setting.value) || 0;
          break;
        case AppSetting.WORK_SA_RATE:
          work.saRate = parseFloat(setting.value) || 0;
          break;
        case AppSetting.WORK_SO_RATE:
          work.soRate = parseFloat(setting.value) || 0;
          break;
        case AppSetting.WORK_DAY_VISIBLE_BEFORE: {
          const valBefore = parseInt(setting.value, 10);
          work.dayVisibleBefore = Number.isNaN(valBefore) ? 3 : valBefore;
          break;
        }
        case AppSetting.WORK_DAY_VISIBLE_AFTER: {
          const valAfter = parseInt(setting.value, 10);
          work.dayVisibleAfter = Number.isNaN(valAfter) ? 3 : valAfter;
          break;
        }
        case AppSetting.SCHEDULING_MAX_WORK_DAYS:
          work.schedulingMaxWorkDays = parseInt(setting.value, 10) || 5;
          break;
        case AppSetting.SCHEDULING_MIN_REST_DAYS:
          work.schedulingMinRestDays = parseInt(setting.value, 10) || 2;
          break;
        case AppSetting.SCHEDULING_MIN_PAUSE_HOURS:
          work.schedulingMinPauseHours = parseFloat(setting.value) || 12;
          break;
        case AppSetting.SCHEDULING_MAX_OPTIMAL_GAP:
          work.schedulingMaxOptimalGap = parseFloat(setting.value) || 2;
          break;
        case AppSetting.SCHEDULING_MAX_DAILY_HOURS:
          work.schedulingMaxDailyHours = parseFloat(setting.value) || 10;
          break;
        case AppSetting.SCHEDULING_MAX_WEEKLY_HOURS:
          work.schedulingMaxWeeklyHours = parseFloat(setting.value) || 50;
          break;
        case AppSetting.SCHEDULING_MAX_CONSECUTIVE_DAYS:
          work.schedulingMaxConsecutiveDays = parseInt(setting.value, 10) || 6;
          break;
      }
    });

    this.contactSettings.set(contact);
    this.emailSettings.set(email);
    this.workSettings.set(work);
    this.openRouteServiceApiKey.set(openRouteServiceApiKey);
    this.deeplApiKey.set(deeplApiKey);

    // Save original state for dirty tracking
    this.contactSettingsOriginal.set(cloneObject(contact));
    this.emailSettingsOriginal.set(cloneObject(email));
    this.workSettingsOriginal.set(cloneObject(work));
    this.openRouteServiceApiKeyOriginal.set(openRouteServiceApiKey);
    this.deeplApiKeyOriginal.set(deeplApiKey);
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

    // Save work settings
    this.saveSetting(work.defaultWorkingHours.toString(), workOriginal.defaultWorkingHours.toString(), AppSetting.WORK_DEFAULT_WORKING_HOURS);
    this.saveSetting(work.overtimeThreshold.toString(), workOriginal.overtimeThreshold.toString(), AppSetting.WORK_OVERTIME_THRESHOLD);
    this.saveSetting(work.vacationDaysPerYear.toString(), workOriginal.vacationDaysPerYear.toString(), AppSetting.WORK_VACATION_DAYS_PER_YEAR);
    this.saveSetting(work.probationPeriod.toString(), workOriginal.probationPeriod.toString(), AppSetting.WORK_PROBATION_PERIOD);
    this.saveSetting(work.noticePeriod.toString(), workOriginal.noticePeriod.toString(), AppSetting.WORK_NOTICE_PERIOD);
    this.saveSetting(work.paymentInterval.toString(), workOriginal.paymentInterval.toString(), AppSetting.WORK_PAYMENT_INTERVAL);
    this.saveSetting(work.guaranteedHours.toString(), workOriginal.guaranteedHours.toString(), AppSetting.WORK_GUARANTEED_HOURS);
    this.saveSetting(work.maximumHours.toString(), workOriginal.maximumHours.toString(), AppSetting.WORK_MAXIMUM_HOURS);
    this.saveSetting(work.minimumHours.toString(), workOriginal.minimumHours.toString(), AppSetting.WORK_MINIMUM_HOURS);
    this.saveSetting(work.fullTime.toString(), workOriginal.fullTime.toString(), AppSetting.WORK_FULL_TIME);
    this.saveSetting(work.nightRate.toString(), workOriginal.nightRate.toString(), AppSetting.WORK_NIGHT_RATE);
    this.saveSetting(work.holidayRate.toString(), workOriginal.holidayRate.toString(), AppSetting.WORK_HOLIDAY_RATE);
    this.saveSetting(work.saRate.toString(), workOriginal.saRate.toString(), AppSetting.WORK_SA_RATE);
    this.saveSetting(work.soRate.toString(), workOriginal.soRate.toString(), AppSetting.WORK_SO_RATE);
    this.saveSetting(work.dayVisibleBefore.toString(), workOriginal.dayVisibleBefore.toString(), AppSetting.WORK_DAY_VISIBLE_BEFORE);
    this.saveSetting(work.dayVisibleAfter.toString(), workOriginal.dayVisibleAfter.toString(), AppSetting.WORK_DAY_VISIBLE_AFTER);
    this.saveSetting(work.schedulingMaxWorkDays.toString(), workOriginal.schedulingMaxWorkDays.toString(), AppSetting.SCHEDULING_MAX_WORK_DAYS);
    this.saveSetting(work.schedulingMinRestDays.toString(), workOriginal.schedulingMinRestDays.toString(), AppSetting.SCHEDULING_MIN_REST_DAYS);
    this.saveSetting(work.schedulingMinPauseHours.toString(), workOriginal.schedulingMinPauseHours.toString(), AppSetting.SCHEDULING_MIN_PAUSE_HOURS);
    this.saveSetting(work.schedulingMaxOptimalGap.toString(), workOriginal.schedulingMaxOptimalGap.toString(), AppSetting.SCHEDULING_MAX_OPTIMAL_GAP);
    this.saveSetting(work.schedulingMaxDailyHours.toString(), workOriginal.schedulingMaxDailyHours.toString(), AppSetting.SCHEDULING_MAX_DAILY_HOURS);
    this.saveSetting(work.schedulingMaxWeeklyHours.toString(), workOriginal.schedulingMaxWeeklyHours.toString(), AppSetting.SCHEDULING_MAX_WEEKLY_HOURS);
    this.saveSetting(work.schedulingMaxConsecutiveDays.toString(), workOriginal.schedulingMaxConsecutiveDays.toString(), AppSetting.SCHEDULING_MAX_CONSECUTIVE_DAYS);

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
      // Update original state after successful save
      this.contactSettingsOriginal.set(cloneObject(this.contactSettings()));
      this.emailSettingsOriginal.set(cloneObject(this.emailSettings()));
      this.workSettingsOriginal.set(cloneObject(this.workSettings()));
      this.openRouteServiceApiKeyOriginal.set(this.openRouteServiceApiKey());
      this.deeplApiKeyOriginal.set(this.deeplApiKey());
    }
  }

  private checkIfDirty(): boolean {
    const contact = this.contactSettings();
    const contactOriginal = this.contactSettingsOriginal();
    const email = this.emailSettings();
    const emailOriginal = this.emailSettingsOriginal();
    const work = this.workSettings();
    const workOriginal = this.workSettingsOriginal();

    return (
      !compareComplexObjects(contact, contactOriginal) ||
      !compareComplexObjects(email, emailOriginal) ||
      !compareComplexObjects(work, workOriginal) ||
      this.openRouteServiceApiKey() !== this.openRouteServiceApiKeyOriginal() ||
      this.deeplApiKey() !== this.deeplApiKeyOriginal()
    );
  }

  resetData(): void {
    this.loadSettings();
  }
}
