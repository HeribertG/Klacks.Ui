import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

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
    standalone: false
})
export class UserAdministrationComponent implements OnInit {
  @ViewChild(NgForm, { static: false }) modalForm: NgForm | undefined;

  newUser: IAuthentication | undefined;
  disabled = true;
  currentEmail = '';
  message = MessageLibrary.DELETE_ENTRY;

  constructor(
    private ngbModal: NgbModal,
    private zone: NgZone,
    public dataManagementSettingsService: DataManagementSettingsService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {}

  onChange() {
    if (this.newUser) {
      if (
        this.newUser.firstName &&
        this.newUser.firstName !== '' &&
        this.newUser.lastName &&
        this.newUser.lastName !== '' &&
        this.newUser.userName &&
        this.newUser.userName !== '' &&
        this.newUser.email &&
        this.newUser.email !== ''
      ) {
        this.disabled = false;
      } else {
        this.disabled = true;
      }
    }
  }

  onIsChanging() {
    this.dataManagementSettingsService.saveAccountsRole();
  }

  onDelete(index: number) {
    const user = this.dataManagementSettingsService.accountsList[index];
    this.dataManagementSettingsService.deleteAccount(user.id!);
  }

  onSentTo(event: string) {
    this.currentEmail = event;
  }

  openMsg(content: any) {
    this.newUser = new Authentication();
    this.ngbModal.open(content, { size: 'sm', centered: true }).result.then(
      (x) => {
        const c = new ChangePassword();
        c.message = MessageLibrary.CHANGEPASSWORD_MAILTEXT;
        c.title = MessageLibrary.CHANGEPASSWORD_TITLE;
        c.email = this.currentEmail;
        c.appName = this.dataManagementSettingsService.appName;
        c.password = generatePassword();
        c.token = this.localStorageService.get(MessageLibrary.TOKEN)!;

        this.dataManagementSettingsService.sentPassword(c);
      },
      (reason) => {
        this.currentEmail = '';
      }
    );
  }

  open(content: any) {
    this.dataManagementSettingsService.appName;

    this.newUser = new Authentication();
    this.newUser.message = MessageLibrary.REGISTERUSER_MAILTEXT;
    this.newUser.title = MessageLibrary.REGISTERUSER_TITLE;
    this.newUser.appName = this.dataManagementSettingsService.appName;
    this.disabled = true;

    this.ngbModal.open(content, { size: 'md', centered: true }).result.then(
      (x) => {
        this.newUser!.password = generatePassword();
        this.dataManagementSettingsService.addAccount(this.newUser!);
      },
      (reason) => {}
    );
  }
}
