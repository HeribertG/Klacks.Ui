// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component, ChangeDetectionStrategy,
  viewChild,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  TemplateRef,
  signal,
  computed,
  effect,
  ChangeDetectorRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { UserAdministrationHeaderComponent } from './user-administration-header/user-administration-header.component';
import { UserAdministrationRowComponent } from './user-administration-row/user-administration-row.component';
import {
  Authentication,
  IAuthentication,
} from 'src/app/domain/models/authentification-class';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { UserAdministrationManagementService } from 'src/app/domain/services/settings/user-administration-management.service';
import { generatePassword } from 'src/app/shared/helpers/password.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { Subject, takeUntil } from 'rxjs';
import { IRefreshable } from 'src/app/domain/interfaces/manageable.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { HttpErrorResponse } from '@angular/common/http';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { MESSAGING_PLUGIN_NAME } from 'src/app/domain/constants/feature-plugin.constants';
import { DataMessagingInvitationService } from 'src/app/infrastructure/api/messaging/data-messaging-invitation.service';
import { AdminInviteResult, DataUserMessengerContactService } from 'src/app/infrastructure/api/messaging/data-user-messenger-contact.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

interface UserFormModel {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  phoneNumber: string;
}

@Component({
  selector: 'app-user-administration',
  templateUrl: './user-administration.component.html',
  styleUrls: ['./user-administration.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    UserAdministrationHeaderComponent,
    UserAdministrationRowComponent
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAdministrationComponent implements OnInit, AfterViewInit, OnDestroy, IRefreshable {
  public readonly refreshableEntities = RefreshEntityTokens.SYSTEM_USER;
  readonly msgTemplate = viewChild.required<TemplateRef<any>>('msg');

  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  public userAdminService = inject(UserAdministrationManagementService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private refreshRegistry = inject(DataRefreshRegistry);
  private manualLoaderService = inject(ManualLoaderService);
  private featurePluginState = inject(FeaturePluginStateService);
  private messagingInvitationService = inject(DataMessagingInvitationService);
  private userMessengerContactService = inject(DataUserMessengerContactService);
  private toastShowService = inject(ToastShowService);
  private unregisterRefresh?: () => void;
  private ngUnsubscribe = new Subject<void>();

  newUser: IAuthentication | undefined;
  pendingDeactivateIndex = -1;
  isEditMode = false;

  private telegramProviderActive = signal(false);

  readonly activeTab = signal<'users' | 'manual'>('users');
  readonly manualContent = signal<string>('');

  public formModel = signal<UserFormModel>({
    firstName: '',
    lastName: '',
    userName: '',
    email: '',
    phoneNumber: '',
  });

  userForm = form(this.formModel, f => {
    debounce(f.firstName, 300);
    debounce(f.lastName, 300);
    debounce(f.userName, 300);
    debounce(f.email, 300);
    debounce(f.phoneNumber, 300);
  });

  isFormValid = computed(() => {
    const data = this.formModel();
    return Boolean(
      data.firstName?.trim().length >= 2 &&
      data.lastName?.trim().length >= 2 &&
      data.userName?.trim().length >= 3 &&
      data.email?.trim().length >= 5 &&
      data.email?.includes('@')
    );
  });

  showUserNameError = computed(() => {
    const userName = this.formModel().userName;
    return userName.length > 0 && userName.length < 3;
  });

  constructor() {
    effect(() => {
      const username = this.userAdminService.generatedUsername();
      if (username && !this.isEditMode) {
        this.formModel.update(model => ({ ...model, userName: username }));
      }
    });
  }

  ngOnInit(): void {
    this.userAdminService.loadAccounts();
    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        if (this.activeTab() === 'manual') {
          this.loadManual();
        }
      });
    this.loadTelegramProviderAvailability();
  }

  private loadTelegramProviderAvailability(): void {
    this.featurePluginState.ensureLoaded().then(() => {
      if (!this.featurePluginState.isPluginEnabled(MESSAGING_PLUGIN_NAME)) {
        this.telegramProviderActive.set(false);
        return;
      }
      this.messagingInvitationService.isTelegramProviderActive().subscribe({
        next: (active) => {
          this.telegramProviderActive.set(active);
          this.cdr.markForCheck();
        },
        error: () => this.telegramProviderActive.set(false),
      });
    });
  }

  canSendUserTelegramInvite(): boolean {
    return (
      this.isEditMode
      && !!this.newUser?.id
      && this.featurePluginState.isPluginEnabled(MESSAGING_PLUGIN_NAME)
      && this.telegramProviderActive()
    );
  }

  sendUserTelegramInvite(): void {
    const userId = this.newUser?.id;
    if (!userId) return;
    this.userMessengerContactService.sendAdminInvite(userId).subscribe({
      next: (resp) => {
        const key = this.userInviteResultKey(resp.result);
        if (resp.result === AdminInviteResult.Success) {
          this.toastShowService.showSuccess(this.translate.instant(key), '');
        } else {
          this.toastShowService.showError(this.translate.instant(key));
        }
      },
      error: (err: HttpErrorResponse) => {
        const key = this.userInviteResultKey(err.error?.result);
        this.toastShowService.showError(this.translate.instant(key));
      },
    });
  }

  private userInviteResultKey(result: string | undefined): string {
    switch (result) {
      case AdminInviteResult.Success: return 'messaging.sendUserTelegramInvite.success';
      case AdminInviteResult.AlreadyLinked: return 'messaging.sendUserTelegramInvite.alreadyLinked';
      case AdminInviteResult.UserNotFound: return 'messaging.sendUserTelegramInvite.userNotFound';
      case AdminInviteResult.NoEmail: return 'messaging.sendUserTelegramInvite.noEmail';
      case AdminInviteResult.SendFailed: return 'messaging.sendUserTelegramInvite.sendFailed';
      case AdminInviteResult.NoTelegramProvider: return 'messaging.sendUserTelegramInvite.noProvider';
      default: return 'messaging.sendUserTelegramInvite.error';
    }
  }

  setTab(tab: 'users' | 'manual'): void {
    this.activeTab.set(tab);
    if (tab === 'manual' && !this.manualContent()) {
      this.loadManual();
    }
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || this.translate.defaultLang || DomainMessages.DEFAULT_LANG;
    this.manualLoaderService.loadManual('user-administration-manual', lang)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(content => this.manualContent.set(content));
  }

  onNameChange(): void {
    if (!this.isEditMode) {
      const data = this.formModel();
      if (data.firstName.trim().length >= 2 && data.lastName.trim().length >= 2) {
        this.userAdminService.generateUsername(data.firstName.trim(), data.lastName.trim());
      }
    }
  }

  onRoleChange(account: IAuthentication, roleName: 'Admin' | 'Authorised', isSelected: boolean): void {
    this.userAdminService.updateAccountRole(account, roleName, isSelected);
  }

  onDeactivate(index: number): void {
    const user = this.userAdminService.accountsList()[index];
    if (user?.id) {
      this.pendingDeactivateIndex = index;

      this.modalService.Filing = '';
      this.modalService.componentContext = 'user-administration';

      const userName =
        `${user.firstName} ${user.lastName}`.trim() || user.email;
      this.modalService.deleteMessageTitle =
        this.translate.instant('DELETE_USER_TITLE');
      this.modalService.deleteMessage = this.translate.instant(
        'DELETE_USER_CONFIRMATION',
        { userName }
      );
      this.modalService.deleteMessageOkButton =
        this.translate.instant('DELETE');
      this.modalService.Filing = user.id.toString();
      this.modalService.openModel(ModalType.Delete);
    }
  }

  onSentTo(email: string): void {
    this.newUser = new Authentication();
    this.newUser.email = email;
    this.ngbModal.open(this.msgTemplate(), { size: 'sm', centered: true }).result.then(
      () => {
        if (this.newUser?.email) {
          this.userAdminService.requestPasswordReset(this.newUser.email);
        }
      },
      () => {}
    );
  }

  open(content: unknown): void {
    this.isEditMode = false;
    this.newUser = new Authentication();
    this.newUser.message = DomainMessages.REGISTERUSER_MAILTEXT;
    this.newUser.title = DomainMessages.REGISTERUSER_TITLE;
    this.newUser.appName = this.dataManagementSettingsService.appSettings.contactSettings().name;
    this.newUser.sendEmail = true;

    this.formModel.set({
      firstName: '',
      lastName: '',
      userName: '',
      email: '',
      phoneNumber: '',
    });

    this.ngbModal.open(content, { size: 'md', centered: true }).result.then(
      () => {
        if (this.newUser) {
          const formData = this.formModel();
          this.newUser.firstName = formData.firstName;
          this.newUser.lastName = formData.lastName;
          this.newUser.userName = formData.userName;
          this.newUser.email = formData.email;
          this.newUser.password = generatePassword();
          this.userAdminService.addAccount(this.newUser);
        }
      },
      () => {}
    );
  }

  onEdit(user: IAuthentication, content: unknown): void {
    this.isEditMode = true;
    this.newUser = { ...user };

    this.formModel.set({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      userName: user.userName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
    });

    this.ngbModal.open(content, { size: 'md', centered: true }).result.then(
      () => {
        if (this.newUser) {
          const formData = this.formModel();
          this.newUser.firstName = formData.firstName;
          this.newUser.lastName = formData.lastName;
          this.newUser.userName = formData.userName;
          this.newUser.email = formData.email;
          this.newUser.phoneNumber = formData.phoneNumber || null;
          this.userAdminService.updateAccount(this.newUser);
        }
      },
      () => {}
    );
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'user-administration' &&
          this.pendingDeactivateIndex >= 0
        ) {
          const user = this.userAdminService.accountsList()[this.pendingDeactivateIndex];
          if (user?.id) {
            this.userAdminService.deactivateAccount(user.id);
          }
          this.pendingDeactivateIndex = -1;
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
          this.cdr.markForCheck();
        }
      });

    this.unregisterRefresh = this.refreshRegistry.register(this);
  }

  ngOnDestroy(): void {
    this.unregisterRefresh?.();
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  reload(): void {
    this.userAdminService.loadAccounts();
  }
}
