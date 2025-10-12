/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ViewChild,
  inject,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { generatePassword } from 'src/app/domain/helpers/password';
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
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    UserAdministrationHeaderComponent,
    UserAdministrationRowComponent,
  ],
})
export class UserAdministrationComponent implements AfterViewInit, OnDestroy {
  @ViewChild(NgForm, { static: false }) modalForm: NgForm | undefined;

  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  public translate = inject(TranslateService);
  private ngUnsubscribe = new Subject<void>();

  newUser: IAuthentication | undefined;
  disabled = true;
  currentEmail = '';
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

  onIsChanging(): void {
    this.dataManagementSettingsService.saveAccountsRole();
  }

  onDelete(index: number): void {
    const user = this.dataManagementSettingsService.accountsList[index];
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
    this.currentEmail = email;
  }

  openMsg(content: any): void {
    this.newUser = new Authentication();
    this.ngbModal.open(content, { size: 'sm', centered: true }).result.then(
      () => {
        this.dataManagementSettingsService.requestPasswordReset(
          this.currentEmail
        );
      },
      () => {
        this.currentEmail = '';
      }
    );
  }

  open(content: any): void {
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
          this.dataManagementSettingsService.addAccount(this.newUser);
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
          const user =
            this.dataManagementSettingsService.accountsList[
              this.pendingDeleteIndex
            ];
          if (user?.id) {
            console.log('UserAdmin: Deleting user with ID:', user.id);
            this.dataManagementSettingsService.deleteAccount(user.id);
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
