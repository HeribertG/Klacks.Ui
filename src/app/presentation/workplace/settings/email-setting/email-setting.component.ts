import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { form, Field } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/data-settings-various.service';
import { EmailTestResult } from 'src/app/domain/interfaces/email-test.interface';
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
  public isTestingEmail = false;

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
}
