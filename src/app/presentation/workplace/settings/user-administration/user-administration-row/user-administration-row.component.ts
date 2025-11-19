import { Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { IAuthentication } from 'src/app/domain/models/authentification-class';

export interface RoleChangeEvent {
  account: IAuthentication;
  roleName: 'Admin' | 'Authorised';
  isSelected: boolean;
}

@Component({
  selector: 'app-user-administration-row',
  templateUrl: './user-administration-row.component.html',
  styleUrls: ['./user-administration-row.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, NgbModule],
})
export class UserAdministrationRowComponent {
  @Input() user: IAuthentication | undefined;
  @Input() enabled: boolean | undefined;
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() isRoleChangeEvent = new EventEmitter<RoleChangeEvent>();
  @Output() isSentToEvent = new EventEmitter<string>();

  public translate = inject(TranslateService);

  onDelete(): void {
    this.isDeleteEvent.emit();
  }

  onAdminChange(): void {
    if (this.user) {
      this.user.isAdmin = Boolean(this.user.isAdmin?.toString() === 'true');
      this.isRoleChangeEvent.emit({
        account: this.user,
        roleName: 'Admin',
        isSelected: this.user.isAdmin,
      });
    }
  }

  onAuthorisedChange(): void {
    if (this.user) {
      this.user.isAuthorised = Boolean(this.user.isAuthorised?.toString() === 'true');
      this.isRoleChangeEvent.emit({
        account: this.user,
        roleName: 'Authorised',
        isSelected: this.user.isAuthorised,
      });
    }
  }

  onClickSentTo(): void {
    if (this.user?.email) {
      this.isSentToEvent.emit(this.user.email);
    }
  }
}
