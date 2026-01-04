import { Component, EventEmitter, inject, Input, OnChanges, Output, effect, signal } from '@angular/core';
import { form, Field } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { IAuthentication } from 'src/app/domain/models/authentification-class';

export interface RoleChangeEvent {
  account: IAuthentication;
  roleName: 'Admin' | 'Authorised';
  isSelected: boolean;
}

interface UserRoleModel {
  isAuthorised: string;
  isAdmin: string;
}

@Component({
  selector: 'app-user-administration-row',
  templateUrl: './user-administration-row.component.html',
  styleUrls: ['./user-administration-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, Field],
})
export class UserAdministrationRowComponent implements OnChanges {
  @Input() user: IAuthentication | undefined;
  @Input() enabled: boolean | undefined;
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() isRoleChangeEvent = new EventEmitter<RoleChangeEvent>();
  @Output() isSentToEvent = new EventEmitter<string>();

  public translate = inject(TranslateService);

  private isInitialized = false;
  private lastModel: UserRoleModel | null = null;

  private userRoleModel = signal<UserRoleModel>({
    isAuthorised: 'false',
    isAdmin: 'false',
  });
  userRoleForm = form(this.userRoleModel);

  constructor() {
    effect(() => {
      const model = this.userRoleModel();
      if (this.isInitialized && this.user) {
        if (this.lastModel && model.isAuthorised !== this.lastModel.isAuthorised) {
          this.user.isAuthorised = model.isAuthorised === 'true';
          this.isRoleChangeEvent.emit({
            account: this.user,
            roleName: 'Authorised',
            isSelected: this.user.isAuthorised,
          });
        }
        if (this.lastModel && model.isAdmin !== this.lastModel.isAdmin) {
          this.user.isAdmin = model.isAdmin === 'true';
          this.isRoleChangeEvent.emit({
            account: this.user,
            roleName: 'Admin',
            isSelected: this.user.isAdmin,
          });
        }
        this.lastModel = { ...model };
      }
    });
  }

  ngOnChanges(): void {
    if (this.user) {
      const initialModel: UserRoleModel = {
        isAuthorised: this.user.isAuthorised ? 'true' : 'false',
        isAdmin: this.user.isAdmin ? 'true' : 'false',
      };
      this.userRoleModel.set(initialModel);
      this.lastModel = { ...initialModel };
      this.isInitialized = true;
    }
  }

  get userName(): string {
    return this.user ? `${this.user.firstName} ${this.user.lastName}` : '';
  }

  get userEmail(): string {
    return this.user?.email || '';
  }

  onDelete(): void {
    this.isDeleteEvent.emit();
  }

  onClickSentTo(): void {
    if (this.user?.email) {
      this.isSentToEvent.emit(this.user.email);
    }
  }
}
