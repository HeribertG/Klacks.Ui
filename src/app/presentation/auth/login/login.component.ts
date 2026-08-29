// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Login page component with credential login and optional OAuth2 provider support.
 * @param loginFormModel - Signal holding username and password form values
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  TemplateRef,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { SyncNotificationToastService } from 'src/app/presentation/auth/sync-notification-toast.service';
import { SetupGateService } from 'src/app/presentation/auth/setup-gate.service';
import { DataOAuth2Service, OAuth2Provider } from 'src/app/infrastructure/api/data-oauth2.service';
import { UserAdministrationService } from 'src/app/infrastructure/api/settings/user-administration.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { OAuth2HandshakeStorageService } from 'src/app/infrastructure/storage/oauth2-handshake-storage.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { PasswordInputComponent } from 'src/app/presentation/shared/password-input/password-input.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { AuthService } from '../auth.service';

interface LoginFormModel {
  username: string;
  password: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    RouterModule,
    PasswordInputComponent,
    NgbModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, AfterViewInit {
  readonly forgotPasswordModal = viewChild.required('forgotPasswordModal', { read: TemplateRef });

  private auth = inject(AuthService);
  private languageConfigService = inject(LanguageConfigService);
  private localStorageService = inject(LocalStorageService);
  private oauth2HandshakeStorage = inject(OAuth2HandshakeStorageService);
  private navigationService = inject(NavigationService);
  private translateService = inject(TranslateService);
  private modalService = inject(NgbModal);
  private userAdministrationService = inject(UserAdministrationService);
  private toastService = inject(ToastShowService);
  private signalRService = inject(SignalRService);
  private assistantSignalRService = inject(AssistantSignalRService);
  private dataOAuth2Service = inject(DataOAuth2Service);
  private readonly destroyRef = inject(DestroyRef);
  private readonly syncNotificationService = inject(SyncNotificationToastService);
  private readonly setupGateService = inject(SetupGateService);
  private readonly authorizationService = inject(AuthorizationService);

  public loginFormModel = signal<LoginFormModel>({ username: '', password: '' });
  public loginForm = form(this.loginFormModel);

  public isClicked = signal(false);
  public resetEmail = signal('');
  public resetEmailSent = signal(false);
  public resetEmailError = signal(false);
  public resetEmailSending = signal(false);
  public oauth2Providers = signal<OAuth2Provider[]>([]);
  public oauth2Loading = signal(false);

  ngOnInit(): void {
    this.translateService.setDefaultLang(this.languageConfigService.getDefaultLanguage());

    const savedLang = this.localStorageService.get(StorageKeys.CURRENT_LANG);
    this.translateService.use(this.languageConfigService.resolveInitialLanguage(savedLang));

    this.loadOAuth2Providers();
  }

  private loadOAuth2Providers(): void {
    this.dataOAuth2Service
      .getProviders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (providers) => {
          this.oauth2Providers.set(providers);
        },
        error: () => {},
      });
  }

  loginWithOAuth2(provider: OAuth2Provider): void {
    this.oauth2Loading.set(true);
    // Use 127.0.0.1 instead of localhost for Synology SSO compatibility
    let origin = window.location.origin;
    if (origin.includes('localhost')) {
      origin = origin.replace('localhost', '127.0.0.1');
    }
    const redirectUri = origin + '/oauth2/callback';

    this.dataOAuth2Service
      .authorize(provider.id, redirectUri)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.oauth2HandshakeStorage.start(response.state, redirectUri);
          window.location.href = response.authorizationUrl;
        },
        error: () => {
          this.toastService.showError('', 'login.oauth2.error');
          this.oauth2Loading.set(false);
        },
      });
  }

  ngAfterViewInit(): void {
    this.auth.checkIfTokenIsValid();
  }

  async onSave(): Promise<void> {
    const { username, password } = this.loginFormModel();
    if (!username || !password) {
      this.toastService.showError('', 'common.form-validation-errors');
      return;
    }

    this.isClicked.set(true);

    if (await this.auth.logIn(username, password)) {
      this.signalRService.resetAuthFailure();
      this.signalRService.startConnection();
      this.assistantSignalRService.startConnection();

      const redirectedToSetup = await this.setupGateService.checkAndRedirect();
      if (!redirectedToSetup) {
        this.navigationService.navigateAfterLogin();
      }
    }

    this.isClicked.set(false);
    this.authorizationService.refresh();
    if (this.auth.isAdminUser()) {
      void this.syncNotificationService.checkAndShow();
    }
  }

  onForgotPassword(): void {
    this.resetEmail.set(this.loginFormModel().username);
    this.resetEmailSent.set(false);
    this.resetEmailError.set(false);
    this.resetEmailSending.set(false);

    this.modalService.open(this.forgotPasswordModal(), {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
  }

  sendResetEmail(): void {
    if (!this.resetEmail() || this.resetEmailSending()) {
      return;
    }

    this.resetEmailSending.set(true);
    this.resetEmailSent.set(false);
    this.resetEmailError.set(false);

    this.userAdministrationService
      .requestPasswordReset(this.resetEmail())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.resetEmailSending.set(false);
          this.resetEmailSent.set(true);
          this.toastService.showInfo('', 'auth.forgot-password.success');

          setTimeout(() => {
            this.modalService.dismissAll();
            this.resetEmail.set('');
          }, 3000);
        },
        error: () => {
          this.resetEmailSending.set(false);
          this.resetEmailError.set(true);
          this.toastService.showInfo('', 'auth.forgot-password.error');
        },
      });
  }

  updatePassword(value: string): void {
    this.loginFormModel.update(m => ({ ...m, password: value }));
  }
}
