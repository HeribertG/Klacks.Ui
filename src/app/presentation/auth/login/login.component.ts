/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { AuthService } from '../auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UserAdministrationService } from 'src/app/infrastructure/api/settings/user-administration.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataOAuth2Service, OAuth2Provider } from 'src/app/infrastructure/api/data-oauth2.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    RouterModule,
    FontAwesomeModule,
    NgbModule
],
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('forgotPasswordModal', { read: TemplateRef })
  forgotPasswordModal!: TemplateRef<any>;
  @ViewChild('loginForm', { static: false }) loginForm!: NgForm;

  private auth = inject(AuthService);
  private authorizationService = inject(AuthorizationService);
  private localStorageService = inject(LocalStorageService);
  private navigationService = inject(NavigationService);
  private translateService = inject(TranslateService);
  private modalService = inject(NgbModal);
  private userAdministrationService = inject(UserAdministrationService);
  private toastService = inject(ToastShowService);
  private signalRService = inject(SignalRService);
  private assistantSignalRService = inject(AssistantSignalRService);
  private dataOAuth2Service = inject(DataOAuth2Service);

  private destroy$ = new Subject<void>();

  public currentLang = StorageKeys.CURRENT_LANG;
  public faEye = faEye;
  public faEyeSlash = faEyeSlash;
  public isClicked = false;
  public password = '';
  public showPassword = false;
  public token = '';
  public username = '';

  public resetEmail = '';
  public resetEmailSent = false;
  public resetEmailError = false;
  public resetEmailSending = false;

  public oauth2Providers: OAuth2Provider[] = [];
  public oauth2Loading = false;

  ngOnInit(): void {
    this.translateService.setDefaultLang(DomainMessages.DEFAULT_LANG);

    const lang =
      this.localStorageService.get(StorageKeys.CURRENT_LANG) !== null;

    if (lang) {
      this.translateService.use(
        this.localStorageService.get(StorageKeys.CURRENT_LANG) as string
      );
    }

    this.loadOAuth2Providers();
  }

  private loadOAuth2Providers(): void {
    this.dataOAuth2Service.getProviders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (providers) => {
          this.oauth2Providers = providers;
        },
        error: (err) => {
          console.error('Error loading OAuth2 providers:', err);
        }
      });
  }

  loginWithOAuth2(provider: OAuth2Provider): void {
    this.oauth2Loading = true;
    // Use 127.0.0.1 instead of localhost for Synology SSO compatibility
    let origin = window.location.origin;
    if (origin.includes('localhost')) {
      origin = origin.replace('localhost', '127.0.0.1');
    }
    const redirectUri = origin + '/oauth2/callback';

    this.dataOAuth2Service.authorize(provider.id, redirectUri)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.localStorageService.set('oauth2_state', response.state);
          this.localStorageService.set('oauth2_redirect_uri', redirectUri);
          window.location.href = response.authorizationUrl;
        },
        error: (err) => {
          console.error('Error initiating OAuth2 login:', err);
          this.toastService.showError('', 'login.oauth2.error');
          this.oauth2Loading = false;
        }
      });
  }

  ngAfterViewInit(): void {
    this.auth.checkIfTokenIsValid();
  }

  async onSave(): Promise<void> {
    if (!this.loginForm.form.valid) {
      this.toastService.showError('', 'common.form-validation-errors');
      return;
    }

    this.isClicked = true;

    if (await this.auth.logIn(this.username, this.password)) {
      this.signalRService.startConnection();
      this.assistantSignalRService.startConnection();
      this.navigationService.navigateToWorkplace();
      this.isClicked = false;
    } else {
      this.isClicked = false;
    }
    this.authorizationService.refresh();
  }

  onForgotPassword(): void {
    this.resetEmail = this.username || '';
    this.resetEmailSent = false;
    this.resetEmailError = false;
    this.resetEmailSending = false;

    this.modalService.open(this.forgotPasswordModal, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
  }

  sendResetEmail(): void {
    if (!this.resetEmail || this.resetEmailSending) {
      return;
    }

    this.resetEmailSending = true;
    this.resetEmailSent = false;
    this.resetEmailError = false;

    this.userAdministrationService
      .requestPasswordReset(this.resetEmail)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetEmailSending = false;
          this.resetEmailSent = true;
          this.toastService.showInfo('', 'auth.forgot-password.success');

          setTimeout(() => {
            this.modalService.dismissAll();
            this.resetEmail = '';
          }, 3000);
        },
        error: () => {
          this.resetEmailSending = false;
          this.resetEmailError = true;
          this.toastService.showInfo('', 'auth.forgot-password.error');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
