import { inject, Injectable, signal } from '@angular/core';
import { ChangePassword } from 'src/app/core/authentification-class';
import { cloneObject } from 'src/app/helpers/object-helpers';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ToastShowService } from 'src/app/toast/toast-show.service';
import { UserAdministrationService } from '../user-administration.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementProfileService {
  public userAdministrationService = inject(UserAdministrationService);
  public toastShowService = inject(ToastShowService);
  private localStorageService = inject(LocalStorageService);

  public isReset = signal(false);
  public isRead = signal(false);

  public changePasswordWrapper: ChangePassword = new ChangePassword();
  public changePasswordWrapperDummy: ChangePassword = new ChangePassword();
  public isPasswordDirty = false;

  /* #region  ChangePassword */

  passwordChangeIsAllowed(value: boolean) {
    this.isPasswordDirty = value;
  }

  private isChangePassword_Dirty(): boolean {
    return this.isPasswordDirty;
  }

  private changePassword() {
    this.changePasswordWrapper!.message =
      MessageLibrary.CHANGEPASSWORDUSER_MAILTEXT;
    this.changePasswordWrapper!.title = MessageLibrary.CHANGEPASSWORD_TITLE;
    this.userAdministrationService
      .changePassword(this.changePasswordWrapper!)
      .subscribe(() => {
        this.isReset.set(true);
        setTimeout(() => this.isReset.set(false), 100);
        this.toastShowService.showSuccess(
          MessageLibrary.REGISTER_CHANGE_PASSWORD,
          MessageLibrary.REGISTER_CHANGE_PASSWORD_HEADER
        );
      });
  }

  /* #endregion  ChangePassword */

  areObjectsDirty(): boolean {
    if (this.isChangePassword_Dirty()) {
      return true;
    }

    return false;
  }

  save(): void {
    if (this.isChangePassword_Dirty()) {
      this.isPasswordDirty = false;
      this.changePassword();
      this.changePasswordWrapper!.oldPassword = '';
      this.changePasswordWrapper!.password = '';
      this.isReset.set(true);
      setTimeout(() => this.isReset.set(false), 100);
    }
  }

  readData() {
    this.changePasswordWrapper = new ChangePassword();
    const username = this.localStorageService.get(
      MessageLibrary.TOKEN_USERNAME
    );
    const subject = this.localStorageService.get(MessageLibrary.TOKEN_SUBJECT);

    if (username && subject) {
      this.changePasswordWrapper.userName = username;
      this.changePasswordWrapper.email = subject;
    }

    this.changePasswordWrapperDummy = cloneObject<ChangePassword>(
      this.changePasswordWrapper
    );
  }
}
