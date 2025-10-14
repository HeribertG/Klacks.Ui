/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  EffectRef,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/data-settings-various.service';
import { EmailTestResult } from 'src/app/domain/models/email-test.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-email-setting',
  templateUrl: './email-setting.component.html',
  styleUrls: ['./email-setting.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    FontAwesomeModule,
  ],
})
export class EmailSettingComponent implements OnInit, OnDestroy {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private dataSettingsVariousService = inject(DataSettingsVariousService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private injector = inject(Injector);

  @ViewChild(NgForm, { static: false }) emailSettingsForm: NgForm | undefined;

  ruleName = '';
  showPassword = false;
  public faEye = faEye;
  public faEyeSlash = faEyeSlash;

  public isDataLoaded = false;
  public isTestingEmail = false;
  public testResult: EmailTestResult | null = null;

  private formSubscription?: Subscription;
  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.readSignals();
  }

  private setupFormSubscription(): void {
    if (this.emailSettingsForm?.valueChanges && !this.formSubscription) {
      this.emailSettingsForm.form.markAsPristine();

      this.formSubscription = this.emailSettingsForm.valueChanges.subscribe(
        () => {
          if (this.emailSettingsForm?.dirty) {
            this.dataManagementSettingsService.settingsChangeTrigger.update(v => v + 1);
          }
        }
      );
    }
  }

  ngOnDestroy(): void {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }

    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  private readSignals(): void {
    const resetEffect = runInInjectionContext(this.injector, () => {
      return effect(() => {
        const isReset = this.dataManagementSettingsService.isReset;
        if (isReset && !this.isDataLoaded) {
          this.isDataLoaded = true;

          setTimeout(() => {
            if (this.emailSettingsForm) {
              this.setupFormSubscription();
            }
          }, 100);
        }
      });
    });
    this.effects.push(resetEffect);
  }

  public testEmailConfiguration(): void {
    this.isTestingEmail = true;
    this.testResult = null;

    // Validate email address format
    const username = this.dataManagementSettingsService.outgoingserverUsername;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(username)) {
      this.isTestingEmail = false;
      this.toastShowService.showError(
        this.translateService.instant('EMAIL_TEST_INVALID_ADDRESS'),
        this.translateService.instant('EMAIL_VALIDATION_ERROR')
      );
      return;
    }

    const emailConfig = {
      server: this.dataManagementSettingsService.outgoingServer,
      port: this.dataManagementSettingsService.outgoingServerPort,
      enableSSL: this.dataManagementSettingsService.enabledSSL,
      authType: this.dataManagementSettingsService.authenticationType,
      username: username,
      password: this.dataManagementSettingsService.outgoingserverPassword,
      replyTo: this.dataManagementSettingsService.replyTo,
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
        error: (error: any) => {
          console.error('Email test error:', error);
          this.isTestingEmail = false;

          this.toastShowService.showError(
            this.translateService.instant('EMAIL_TEST_UNEXPECTED_ERROR'),
            this.translateService.instant('EMAIL_TEST_ERROR'),
            error.message || ''
          );
        },
      });
  }
}
