import { Injectable, inject, signal, computed, effect, DestroyRef, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/data-settings-various.service';
import { ISetting, Setting, AppSetting } from 'src/app/domain/models/settings-various-class';
import {
  IAppContactSettings,
  IEmailServerSettings,
  AppContactSettings,
  EmailServerSettings
} from 'src/app/domain/models/app-settings.model';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';

@Injectable({
  providedIn: 'root',
})
export class AppSettingsManagementService {
  private dataSettingsService = inject(DataSettingsVariousService);
  private destroyRef = inject(DestroyRef);

  public contactSettings = signal<IAppContactSettings>(new AppContactSettings());
  public emailSettings = signal<IEmailServerSettings>(new EmailServerSettings());

  private contactSettingsOriginal = signal<IAppContactSettings>(new AppContactSettings());
  private emailSettingsOriginal = signal<IEmailServerSettings>(new EmailServerSettings());

  public isLoading = signal<boolean>(false);
  public isDirty = computed(() => this.checkIfDirty());

  private settingsList: ISetting[] = [];
  private saveCounter = 0;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.contactSettings();
      this.emailSettings();

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
      }
    });

    this.contactSettings.set(contact);
    this.emailSettings.set(email);

    // Save original state for dirty tracking
    this.contactSettingsOriginal.set(cloneObject(contact));
    this.emailSettingsOriginal.set(cloneObject(email));
  }

  save(): void {
    if (!this.isDirty()) {
      return;
    }

    const contact = this.contactSettings();
    const contactOriginal = this.contactSettingsOriginal();
    const email = this.emailSettings();
    const emailOriginal = this.emailSettingsOriginal();

    // Save contact settings
    this.saveSetting(contact.name, contactOriginal.name, AppSetting.APP_NAME);
    this.saveSetting(contact.addressName, contactOriginal.addressName, AppSetting.APP_ADDRESS_NAME);
    this.saveSetting(contact.supplementAddress, contactOriginal.supplementAddress, AppSetting.APP_ADDRESS_SUPPLEMENT);
    this.saveSetting(contact.address, contactOriginal.address, AppSetting.APP_ADDRESS_ADDRESS);
    this.saveSetting(contact.zip, contactOriginal.zip, AppSetting.APP_ADDRESS_ZIP);
    this.saveSetting(contact.place, contactOriginal.place, AppSetting.APP_ADDRESS_PLACE);
    this.saveSetting(contact.phone, contactOriginal.phone, AppSetting.APP_ADDRESS_PHONE);
    this.saveSetting(contact.email, contactOriginal.email, AppSetting.APP_ADDRESS_MAIL);
    this.saveSetting(contact.accountingStart.toString(), contactOriginal.accountingStart.toString(), AppSetting.APP_ACCOUNTING_START);
    this.saveSetting(contact.mark, contactOriginal.mark, AppSetting.APP_MARK);

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
        .subscribe(() => {
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
    }
  }

  private checkIfDirty(): boolean {
    const contact = this.contactSettings();
    const contactOriginal = this.contactSettingsOriginal();
    const email = this.emailSettings();
    const emailOriginal = this.emailSettingsOriginal();

    return (
      !compareComplexObjects(contact, contactOriginal) ||
      !compareComplexObjects(email, emailOriginal)
    );
  }

  resetData(): void {
    this.loadSettings();
  }
}
