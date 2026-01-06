/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ViewChild,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  TemplateRef,
  signal,
  computed,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, Field, debounce } from '@angular/forms/signals';
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
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { Subject, takeUntil } from 'rxjs';

interface UserFormModel {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
}

@Component({
  selector: 'app-user-administration',
  templateUrl: './user-administration.component.html',
  styleUrls: ['./user-administration.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    Field,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    UserAdministrationHeaderComponent,
    UserAdministrationRowComponent
],
})
export class UserAdministrationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('msg', { static: false }) msgTemplate!: TemplateRef<any>;

  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  public userAdminService = inject(UserAdministrationManagementService);
  public translate = inject(TranslateService);
  private ngUnsubscribe = new Subject<void>();

  newUser: IAuthentication | undefined;
  message = MessageLibrary.DELETE_ENTRY;
  pendingDeleteIndex = -1;

  private formModel = signal<UserFormModel>({
    firstName: '',
    lastName: '',
    userName: '',
    email: '',
  });

  userForm = form(this.formModel, f => {
    debounce(f.firstName, 300);
    debounce(f.lastName, 300);
    debounce(f.userName, 300);
    debounce(f.email, 300);
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

  ngOnInit(): void {
    this.userAdminService.loadAccounts();
  }

  onRoleChange(account: IAuthentication, roleName: 'Admin' | 'Authorised', isSelected: boolean): void {
    this.userAdminService.updateAccountRole(account, roleName, isSelected);
  }

  onDelete(index: number): void {
    const user = this.userAdminService.accountsList()[index];
    if (user?.id) {
      this.pendingDeleteIndex = index;

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
    this.ngbModal.open(this.msgTemplate, { size: 'sm', centered: true }).result.then(
      () => {
        if (this.newUser?.email) {
          this.userAdminService.requestPasswordReset(this.newUser.email);
        }
      },
      () => {}
    );
  }

  open(content: unknown): void {
    this.newUser = new Authentication();
    this.newUser.message = MessageLibrary.REGISTERUSER_MAILTEXT;
    this.newUser.title = MessageLibrary.REGISTERUSER_TITLE;
    this.newUser.appName = this.dataManagementSettingsService.appName;
    this.newUser.sendEmail = true;

    this.formModel.set({
      firstName: '',
      lastName: '',
      userName: '',
      email: '',
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

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'user-administration' &&
          this.pendingDeleteIndex >= 0
        ) {
          const user = this.userAdminService.accountsList()[this.pendingDeleteIndex];
          if (user?.id) {
            this.userAdminService.deleteAccount(user.id);
          }
          this.pendingDeleteIndex = -1;
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
