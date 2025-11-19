/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ViewChild,
  inject,
  OnDestroy,
  AfterViewInit,
  TemplateRef,
} from '@angular/core';

import { FormsModule, NgForm } from '@angular/forms';
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

@Component({
  selector: 'app-user-administration',
  templateUrl: './user-administration.component.html',
  styleUrls: ['./user-administration.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    UserAdministrationHeaderComponent,
    UserAdministrationRowComponent
],
})
export class UserAdministrationComponent implements AfterViewInit, OnDestroy {
  @ViewChild(NgForm, { static: false }) modalForm: NgForm | undefined;
  @ViewChild('msg', { static: false }) msgTemplate!: TemplateRef<any>;

  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  public userAdminService = inject(UserAdministrationManagementService);
  public translate = inject(TranslateService);
  private ngUnsubscribe = new Subject<void>();

  newUser: IAuthentication | undefined;
  disabled = true;
  message = MessageLibrary.DELETE_ENTRY;
  pendingDeleteIndex = -1;

  onChange(): void {
    if (this.newUser) {
      const isValid = Boolean(
        this.newUser.firstName &&
          this.newUser.firstName.trim().length >= 2 &&
          this.newUser.lastName &&
          this.newUser.lastName.trim().length >= 2 &&
          this.newUser.userName &&
          this.newUser.userName.trim().length >= 3 &&
          this.newUser.email &&
          this.newUser.email.trim().length >= 5 &&
          this.newUser.email.includes('@')
      );

      this.disabled = !isValid;
    }
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
    this.disabled = true;

    this.ngbModal.open(content, { size: 'md', centered: true }).result.then(
      () => {
        if (this.newUser) {
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
            console.log('UserAdmin: Deleting user with ID:', user.id);
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
