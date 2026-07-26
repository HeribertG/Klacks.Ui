// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { ChangePassword } from 'src/app/domain/models/authentification-class';
import { cloneObject } from 'src/app/shared/helpers/object.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { UserAdministrationService } from 'src/app/infrastructure/api/settings/user-administration.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ILoadable, IResettable, ISaveable, INavigable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementProfileService implements ISaveable, IResettable, ILoadable, INavigable {
  public userAdministrationService = inject(UserAdministrationService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private localStorageService = inject(LocalStorageService);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroy$ = new Subject<void>();

  constructor() {
    this.registry.register(
      RouteName.PROFILE,
      DataManagementProfileService
    );
  }

  // IManageable implementation
  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }
  public onSaveCompleted?: () => void;

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
      DomainMessages.CHANGEPASSWORDUSER_MAILTEXT;
    this.changePasswordWrapper!.title = DomainMessages.CHANGEPASSWORD_TITLE;
    this.userAdministrationService
      .changePassword(this.changePasswordWrapper!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isReset.set(true);
          resetSignalAfterDelay(this.isReset);
          this.eventBus.emit(DomainEventType.SUCCESS, {
            message: DomainMessages.REGISTER_CHANGE_PASSWORD,
            context: DomainMessages.REGISTER_CHANGE_PASSWORD_HEADER
          });
          if (this.onSaveCompleted) {
            this.onSaveCompleted();
          }
        },
        error: () => {
          if (this.onSaveCompleted) {
            this.onSaveCompleted();
          }
        },
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
      resetSignalAfterDelay(this.isReset);
    }
  }

  readData() {
    this.changePasswordWrapper = new ChangePassword();
    const username = this.localStorageService.get(
      StorageKeys.TOKEN_USERNAME
    );
    const subject = this.localStorageService.get(StorageKeys.TOKEN_SUBJECT);

    if (username && subject) {
      this.changePasswordWrapper.userName = username;
      this.changePasswordWrapper.email = subject;
    }

    this.changePasswordWrapperDummy = cloneObject<ChangePassword>(
      this.changePasswordWrapper
    );
  }

  resetData(): void {
    this.readData();
    this.isPasswordDirty = false;
  }

  goBack(): string {
    return '';
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
