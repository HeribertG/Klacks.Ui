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
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UserAdministrationService } from 'src/app/infrastructure/api/user-administration.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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

  private destroy$ = new Subject<void>();

  public currentLang = MessageLibrary.CURRENT_LANG;
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

  ngOnInit(): void {
    this.translateService.setDefaultLang(MessageLibrary.DEFAULT_LANG);

    const lang =
      this.localStorageService.get(MessageLibrary.CURRENT_LANG) !== null;

    if (lang) {
      this.translateService.use(
        this.localStorageService.get(MessageLibrary.CURRENT_LANG) as string
      );
    }
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
