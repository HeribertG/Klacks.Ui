// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Form for changing the user's password including strength validation.
 * @param isChangingEvent - Emits true when the user modifies any field, false on reset
 */
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  effect,
  inject,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { disabled, form, FormField } from '@angular/forms/signals';
import { PasswordInputComponent } from 'src/app/presentation/shared/password-input/password-input.component';
import { DataManagementProfileService } from 'src/app/domain/services/schedule/data-management-profile.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { checkPasswordStrength, PasswordCheckStrength } from 'src/app/shared/helpers/password.helper';

@Component({
  selector: 'app-profile-data-edit',
  templateUrl: './profile-data-edit.component.html',
  styleUrls: ['./profile-data-edit.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormField, PasswordInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDataEditComponent {
  public isChangingEvent = output<boolean>();

  public passwordStrength = signal('');
  public passwordStrengthFlag = signal(false);

  private pwModel = signal({ oldPassword: '', newPassword: '', repeatPassword: '' });
  public pwForm = form(this.pwModel, (f) => {
    disabled(f.repeatPassword, { when: () => !this.passwordStrengthFlag() });
  });

  public dataManagementProfileService = inject(DataManagementProfileService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      const model = this.pwModel();
      const flag = this.passwordStrengthFlag();
      untracked(() => {
        this.dataManagementProfileService.changePasswordWrapper!.password = model.newPassword;
        this.dataManagementProfileService.changePasswordWrapper!.oldPassword = model.oldPassword;
        const isValid = !!(model.newPassword && model.newPassword === model.repeatPassword && model.oldPassword && flag);
        this.dataManagementProfileService.passwordChangeIsAllowed(isValid);
      });
    });

    effect(() => {
      const isReset = this.dataManagementProfileService.isReset();
      if (isReset) {
        untracked(() => {
          this.pwModel.set({ oldPassword: '', newPassword: '', repeatPassword: '' });
          this.pwForm().reset();
          this.passwordStrength.set('');
          this.passwordStrengthFlag.set(false);
          queueMicrotask(() => {
            this.cdr.markForCheck();
            this.isChangingEvent.emit(false);
          });
        });
      }
    });

    effect(() => {
      const isDirty = this.pwForm().dirty();
      if (isDirty) {
        untracked(() => queueMicrotask(() => this.isChangingEvent.emit(true)));
      }
    });
  }

  onKeyUp(): void {
    const pw = this.pwModel().newPassword;
    if (!pw) {
      this.passwordStrength.set('');
      this.passwordStrengthFlag.set(false);
      return;
    }

    const res = checkPasswordStrength(pw);
    switch (res) {
      case PasswordCheckStrength.Short:
      case PasswordCheckStrength.Weak:
      case PasswordCheckStrength.Common:
        this.passwordStrength.set(DomainMessages.PASSWORD_STRENGTH_WEAK);
        this.passwordStrengthFlag.set(false);
        break;
      case PasswordCheckStrength.Ok:
        this.passwordStrength.set(DomainMessages.PASSWORD_STRENGTH_COMMON);
        this.passwordStrengthFlag.set(false);
        break;
      case PasswordCheckStrength.Strong:
        this.passwordStrength.set(DomainMessages.PASSWORD_STRENGTH_STRONG);
        this.passwordStrengthFlag.set(true);
        break;
    }
  }
}
