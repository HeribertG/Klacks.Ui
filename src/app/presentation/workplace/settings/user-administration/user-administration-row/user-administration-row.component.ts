// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, ChangeDetectionStrategy,
  effect,
  signal,
  input,
  output,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';

import { IAuthentication } from 'src/app/domain/models/authentification-class';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconGripVerticalComponent } from 'src/app/presentation/icons/icon-grip-vertical.component';

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
  imports: [TranslateModule, FormField, CdkDragHandle, TrashIconRedComponent, IconGripVerticalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAdministrationRowComponent {
  readonly user = input<IAuthentication | undefined>(undefined);
  readonly enabled = input<boolean | undefined>(undefined);
  readonly isDeleteEvent = output<void>();
  readonly isDeactivateEvent = output<void>();
  readonly isReactivateEvent = output<void>();
  readonly isRoleChangeEvent = output<RoleChangeEvent>();
  readonly isSentToEvent = output<string>();
  readonly isEditEvent = output<IAuthentication>();

  private isInitialized = false;
  private lastModel: UserRoleModel | null = null;

  private userRoleModel = signal<UserRoleModel>({
    isAuthorised: 'false',
    isAdmin: 'false',
  });
  userRoleForm = form(this.userRoleModel);

  constructor() {
    effect(() => {
      const u = this.user();
      if (u) {
        const initialModel: UserRoleModel = {
          isAuthorised: u.isAuthorised ? 'true' : 'false',
          isAdmin: u.isAdmin ? 'true' : 'false',
        };
        this.userRoleModel.set(initialModel);
        this.lastModel = { ...initialModel };
        this.isInitialized = true;
      }
    });

    effect(() => {
      const model = this.userRoleModel();
      const u = this.user();
      if (this.isInitialized && u) {
        if (
          this.lastModel &&
          model.isAuthorised !== this.lastModel.isAuthorised
        ) {
          u.isAuthorised = model.isAuthorised === 'true';
          this.isRoleChangeEvent.emit({
            account: u,
            roleName: 'Authorised',
            isSelected: u.isAuthorised,
          });
        }
        if (this.lastModel && model.isAdmin !== this.lastModel.isAdmin) {
          u.isAdmin = model.isAdmin === 'true';
          this.isRoleChangeEvent.emit({
            account: u,
            roleName: 'Admin',
            isSelected: u.isAdmin,
          });
        }
        this.lastModel = { ...model };
      }
    });
  }

  get userName(): string {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName} (${u.userName})` : '';
  }

  get userEmail(): string {
    return this.user()?.email || '';
  }

  get isDeactivated(): boolean {
    return Boolean(this.user()?.deactivatedAt);
  }

  onDelete(): void {
    this.isDeleteEvent.emit();
  }

  onDeactivate(): void {
    this.isDeactivateEvent.emit();
  }

  onReactivate(): void {
    this.isReactivateEvent.emit();
  }

  onClickSentTo(): void {
    const email = this.user()?.email;
    if (email) {
      this.isSentToEvent.emit(email);
    }
  }

  onDoubleClickEdit(): void {
    const u = this.user();
    if (this.enabled() && u) {
      this.isEditEvent.emit(u);
    }
  }
}
