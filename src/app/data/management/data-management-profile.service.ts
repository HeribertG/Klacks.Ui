import { Inject, Injectable, signal } from '@angular/core';
import { ChangePassword } from 'src/app/core/authentification-class';
import { cloneObject } from 'src/app/helpers/object-helpers';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ToastService } from 'src/app/toast/toast.service';
import { UserAdministrationService } from '../user-administration.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementProfileService {
  public isReset = signal(false);
  public isRead = signal(false);

  public changePasswordWrapper: ChangePassword = new ChangePassword();
  public changePasswordWrapperDummy: ChangePassword = new ChangePassword();
  public isPasswordDirty = false;

  constructor(
    @Inject(UserAdministrationService)
    public userAdministrationService: UserAdministrationService,
    public toastService: ToastService,
    private localStorageService: LocalStorageService
  ) {}

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
      .subscribe((x) => {
        this.isReset.set(true);
        setTimeout(() => this.isReset.set(false), 100);
        this.showSuccess(
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

  showSuccess(message: string, header: string) {
    this.toastService.show(message, {
      classname: 'bg-success text-light',
      delay: 2000,
      autohide: true,
      headertext: header,
    });
  }
}
