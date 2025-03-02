import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from 'src/app/icons/icons.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';

// Unterkomponenten
import { UserAdministrationHeaderComponent } from './user-administration-header/user-administration-header.component';
import { UserAdministrationRowComponent } from './user-administration-row/user-administration-row.component';

// Services und Modelle
import {
  Authentication,
  ChangePassword,
  IAuthentication,
} from 'src/app/core/authentification-class';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { generatePassword } from 'src/app/helpers/password';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';

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
    IconsModule,
    SharedModule,
    SpinnerModule,
    UserAdministrationHeaderComponent,
    UserAdministrationRowComponent,
  ],
})
export class UserAdministrationComponent {
  @ViewChild(NgForm, { static: false }) modalForm: NgForm | undefined;

  private ngbModal = inject(NgbModal);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private localStorageService = inject(LocalStorageService);
  public translate = inject(TranslateService);

  newUser: IAuthentication | undefined;
  disabled = true;
  currentEmail = '';
  message = MessageLibrary.DELETE_ENTRY;

  onChange(): void {
    if (this.newUser) {
      const isValid = Boolean(
        this.newUser.firstName &&
          this.newUser.firstName !== '' &&
          this.newUser.lastName &&
          this.newUser.lastName !== '' &&
          this.newUser.userName &&
          this.newUser.userName !== '' &&
          this.newUser.email &&
          this.newUser.email !== ''
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
      this.dataManagementSettingsService.deleteAccount(user.id);
    }
  }

  onSentTo(email: string): void {
    this.currentEmail = email;
  }

  openMsg(content: any): void {
    this.newUser = new Authentication();
    this.ngbModal.open(content, { size: 'sm', centered: true }).result.then(
      () => {
        const changePassword = new ChangePassword();
        changePassword.message = MessageLibrary.CHANGEPASSWORD_MAILTEXT;
        changePassword.title = MessageLibrary.CHANGEPASSWORD_TITLE;
        changePassword.email = this.currentEmail;
        changePassword.appName = this.dataManagementSettingsService.appName;
        changePassword.password = generatePassword();

        const token = this.localStorageService.get(MessageLibrary.TOKEN);
        if (token) {
          changePassword.token = token;
          this.dataManagementSettingsService.sentPassword(changePassword);
        }
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
}
