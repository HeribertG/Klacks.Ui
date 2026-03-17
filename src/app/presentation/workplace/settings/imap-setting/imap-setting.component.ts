// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { EmailTestResult, ImapTestRequest } from 'src/app/domain/interfaces/email-test.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

interface ImapModel {
  server: string;
  port: string;
  username: string;
  password: string;
  enableSSL: string;
  folder: string;
  pollInterval: string;
}

@Component({
  selector: 'app-imap-setting',
  templateUrl: './imap-setting.component.html',
  styleUrls: ['./imap-setting.component.scss'],
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, FormField],
})
export class ImapSettingComponent implements OnInit, OnDestroy {
  private appSettingsService = inject(AppSettingsManagementService);
  private dataSettingsVariousService = inject(DataSettingsVariousService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  public faEye = faEye;
  public faEyeSlash = faEyeSlash;
  public showPassword = signal(false);
  public isTestingImap = false;

  private ngUnsubscribe = new Subject<void>();
  private isInitialized = false;

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

  constructor() {
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
  }

  async ngOnInit(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    const imap = this.appSettingsService.imapSettings();

    this.imapModel.set({
      server: imap.server,
      port: imap.port,
      username: imap.username,
      password: imap.password,
      enableSSL: imap.enableSSL,
      folder: imap.folder,
      pollInterval: imap.pollInterval,
    });

    this.isInitialized = true;
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
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
