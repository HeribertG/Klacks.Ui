// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Forced setup page shown to the seeded admin account on a freshly deployed instance.
 * Collects the caller's own admin account, replaces the seeded admin with it on the server
 * (which also deactivates the seeded admin in the same transaction), then logs the local
 * session out and sends the user to a normal login with the new credentials - no auto-login,
 * no other part of the app is reachable until this page has been completed.
 * @param setupFormModel - Signal holding the new admin's registration form values
 */
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SetupOwnAdminRequest } from 'src/app/domain/models/setup/setup-own-admin-request.interface';
import { DataSetupService } from 'src/app/infrastructure/api/data-setup.service';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { PasswordInputComponent } from 'src/app/presentation/shared/password-input/password-input.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

interface SetupFormModel {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  password: string;
}

const SETUP_OWN_ADMIN_DEFAULTS = {
  appName: '',
  message: '',
  sendEmail: false,
  title: '',
} as const;

const SETUP_TOAST_NAME = 'SETUP_OWN_ADMIN';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: true,
  imports: [FormsModule, FormField, TranslateModule, PasswordInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupComponent {
  private readonly dataSetupService = inject(DataSetupService);
  private readonly authService = inject(AuthService);
  private readonly navigationService = inject(NavigationService);
  private readonly toastService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  public setupFormModel = signal<SetupFormModel>({
    firstName: '',
    lastName: '',
    email: '',
    userName: '',
    password: '',
  });
  public setupForm = form(this.setupFormModel);

  public isSaving = signal(false);

  updatePassword(value: string): void {
    this.setupFormModel.update((m) => ({ ...m, password: value }));
  }

  onSave(): void {
    if (this.isSaving()) {
      return;
    }

    const { firstName, lastName, email, userName, password } = this.setupFormModel();
    if (!firstName || !lastName || !email || !userName || !password) {
      this.toastService.showError(
        this.translateService.instant('common.form-validation-errors'),
        SETUP_TOAST_NAME
      );
      return;
    }

    this.isSaving.set(true);

    const request: SetupOwnAdminRequest = {
      ...SETUP_OWN_ADMIN_DEFAULTS,
      firstName,
      lastName,
      email,
      userName,
      password,
    };

    this.dataSetupService
      .completeOwnAdmin(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.onCompleted(),
        error: () => {
          this.isSaving.set(false);
          this.toastService.showError(
            this.translateService.instant('setup.error'),
            SETUP_TOAST_NAME
          );
        },
      });
  }

  private onCompleted(): void {
    this.authService.logOut();
    this.toastService.showSuccess(this.translateService.instant('setup.success'), '');
    this.navigationService.navigateToRoot();
  }
}
