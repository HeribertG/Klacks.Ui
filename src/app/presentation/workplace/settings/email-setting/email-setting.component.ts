// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { form, Field } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { EmailTestResult, ImapTestRequest } from 'src/app/domain/interfaces/email-test.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

interface EmailModel {
  outgoingServer: string;
  outgoingServerPort: string;
  outgoingServerTimeout: string;
  enabledSSL: string;
  authenticationType: string;
  dispositionNotification: string;
  readReceipt: string;
  replyTo: string;
  username: string;
  password: string;
}

interface ImapModel {
  server: string;
  port: string;
  username: string;
  password: string;
  enableSSL: string;
  folder: string;
  pollInterval: string;
}

interface ContactModel {
  mark: string;
}

@Component({
  selector: 'app-email-setting',
  templateUrl: './email-setting.component.html',
  styleUrls: ['./email-setting.component.scss'],
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, Field],
})
export class EmailSettingComponent implements OnInit, OnDestroy {
  private appSettingsService = inject(AppSettingsManagementService);
  private dataSettingsVariousService = inject(DataSettingsVariousService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  public faEye = faEye;
  public faEyeSlash = faEyeSlash;
  public showPassword = signal(false);
  public showImapPassword = signal(false);
  public isTestingEmail = false;
  public isTestingImap = false;

  private ngUnsubscribe = new Subject<void>();
  private isInitialized = false;

  private emailModel = signal<EmailModel>({
    outgoingServer: '',
    outgoingServerPort: '',
    outgoingServerTimeout: '',
    enabledSSL: 'true',
    authenticationType: 'LOGIN',
    dispositionNotification: 'false',
    readReceipt: '',
    replyTo: '',
    username: '',
    password: '',
  });
  emailForm = form(this.emailModel);

  private imapModel = signal<ImapModel>({
    server: '',
    port: '993',
    username: '',
    password: '',
    enableSSL: 'true',
    folder: 'INBOX',
    pollInterval: '300',
  });
  imapForm = form(this.imapModel);

  private contactModel = signal<ContactModel>({ mark: '' });
  contactForm = form(this.contactModel);

  constructor() {
    effect(() => {
      const model = this.emailModel();
      if (this.isInitialized) {
        this.appSettingsService.emailSettings.update(s => ({
          ...s,
          outgoingServer: model.outgoingServer,
          outgoingServerPort: model.outgoingServerPort,
          outgoingServerTimeout: model.outgoingServerTimeout,
          enabledSSL: model.enabledSSL,
          authenticationType: model.authenticationType,
          dispositionNotification: model.dispositionNotification,
          readReceipt: model.readReceipt,
          replyTo: model.replyTo,
          username: model.username,
          password: model.password,
        }));
      }
    });

    effect(() => {
      const model = this.imapModel();
      if (this.isInitialized) {
        this.appSettingsService.imapSettings.update(s => ({
          ...s,
          server: model.server,
          port: model.port,
          username: model.username,
          password: model.password,
          enableSSL: model.enableSSL,
          folder: model.folder,
          pollInterval: model.pollInterval,
        }));
      }
    });

    effect(() => {
      const model = this.contactModel();
      if (this.isInitialized) {
        this.appSettingsService.contactSettings.update(s => ({
          ...s,
          mark: model.mark,
        }));
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    const email = this.appSettingsService.emailSettings();
    const imap = this.appSettingsService.imapSettings();
    const contact = this.appSettingsService.contactSettings();

    this.emailModel.set({
      outgoingServer: email.outgoingServer,
      outgoingServerPort: email.outgoingServerPort,
      outgoingServerTimeout: email.outgoingServerTimeout,
      enabledSSL: email.enabledSSL,
      authenticationType: email.authenticationType,
      dispositionNotification: email.dispositionNotification,
      readReceipt: email.readReceipt,
      replyTo: email.replyTo,
      username: email.username,
      password: email.password,
    });

    this.imapModel.set({
      server: imap.server,
      port: imap.port,
      username: imap.username,
      password: imap.password,
      enableSSL: imap.enableSSL,
      folder: imap.folder,
      pollInterval: imap.pollInterval,
    });

    this.contactModel.set({ mark: contact.mark });
    this.isInitialized = true;
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleShowImapPassword(): void {
    this.showImapPassword.update(v => !v);
  }

  public testEmailConfiguration(): void {
    this.isTestingEmail = true;

    const model = this.emailModel();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(model.username)) {
      this.isTestingEmail = false;
      this.toastShowService.showError(
        this.translateService.instant('EMAIL_TEST_INVALID_ADDRESS'),
        this.translateService.instant('EMAIL_VALIDATION_ERROR')
      );
      return;
    }

    const emailConfig = {
      server: model.outgoingServer,
      port: model.outgoingServerPort,
      enableSSL: model.enabledSSL,
      authType: model.authenticationType,
      username: model.username,
      password: model.password,
      replyTo: model.replyTo,
    };

    this.dataSettingsVariousService
      .testEmailConfiguration(emailConfig)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (result: EmailTestResult) => {
          this.isTestingEmail = false;

          if (result.success) {
            this.toastShowService.showSuccess(
              result.message,
              this.translateService.instant('EMAIL_TEST_SUCCESSFUL')
            );
          } else {
            this.toastShowService.showError(
              result.message,
              this.translateService.instant('EMAIL_TEST_ERROR'),
              result.errorDetails || ''
            );
          }
        },
        error: (error: unknown) => {
          console.error('Email test error:', error);
          this.isTestingEmail = false;

          const errorMessage = error instanceof Error ? error.message : '';
          this.toastShowService.showError(
            this.translateService.instant('EMAIL_TEST_UNEXPECTED_ERROR'),
            this.translateService.instant('EMAIL_TEST_ERROR'),
            errorMessage
          );
        },
      });
  }

  public testImapConfiguration(): void {
    this.isTestingImap = true;

    const model = this.imapModel();

    if (!model.server?.trim()) {
      this.isTestingImap = false;
      this.toastShowService.showError(
        this.translateService.instant('IMAP_TEST_SERVER_REQUIRED'),
        this.translateService.instant('IMAP_VALIDATION_ERROR')
      );
      return;
    }

    const imapConfig: ImapTestRequest = {
      server: model.server.trim(),
      port: parseInt(model.port, 10) || 993,
      username: model.username.trim(),
      password: model.password,
      enableSSL: model.enableSSL.toLowerCase() === 'true',
      folder: model.folder.trim() || 'INBOX',
    };

    this.dataSettingsVariousService
      .testImapConfiguration(imapConfig)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (result: EmailTestResult) => {
          this.isTestingImap = false;

          if (result.success) {
            this.toastShowService.showSuccess(
              result.message,
              this.translateService.instant('IMAP_TEST_SUCCESSFUL')
            );
          } else {
            this.toastShowService.showError(
              result.message,
              this.translateService.instant('IMAP_TEST_ERROR'),
              result.errorDetails || ''
            );
          }
        },
        error: (error: unknown) => {
          console.error('IMAP test error:', error);
          this.isTestingImap = false;

          const errorMessage = error instanceof Error ? error.message : '';
          this.toastShowService.showError(
            this.translateService.instant('IMAP_TEST_UNEXPECTED_ERROR'),
            this.translateService.instant('IMAP_TEST_ERROR'),
            errorMessage
          );
        },
      });
  }
}
