// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  Component, ChangeDetectionStrategy,
  computed,
  effect,
  signal,
  input,
  output,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';

import { IAuthentication } from 'src/app/domain/models/authentication.interface';
import { RightsChangeEvent } from './rights-change-event.interface';
import { UserRightsModel } from './user-rights-model.interface';
import { USER_RIGHTS_LEVEL, UserRightsLevel } from 'src/app/domain/constants/user-rights-level.constants';
import { userRightsLevelOf } from 'src/app/domain/helpers/user-rights-level.helper';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-user-administration-row',
  templateUrl: './user-administration-row.component.html',
  styleUrls: ['./user-administration-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormField, TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAdministrationRowComponent {
  readonly user = input<IAuthentication | undefined>(undefined);
  readonly enabled = input<boolean | undefined>(undefined);
  readonly isDeactivateEvent = output<void>();
  readonly isRightsChangeEvent = output<RightsChangeEvent>();
  readonly isSentToEvent = output<string>();
  readonly isEditEvent = output<IAuthentication>();

  readonly rightsLevels = USER_RIGHTS_LEVEL;
  readonly currentRights = computed(() => {
    const u = this.user();
    return u ? userRightsLevelOf(u) : USER_RIGHTS_LEVEL.Planner;
  });

  private isInitialized = false;
  private lastRights: UserRightsLevel | null = null;

  private userRightsModel = signal<UserRightsModel>({
    rights: USER_RIGHTS_LEVEL.Planner,
  });
  userRightsForm = form(this.userRightsModel);

  constructor() {
    effect(() => {
      const u = this.user();
      if (u) {
        const rights = userRightsLevelOf(u);
        this.userRightsModel.set({ rights });
        this.lastRights = rights;
        this.isInitialized = true;
      }
    });

    effect(() => {
      const rights = this.userRightsModel().rights;
      const u = this.user();
      if (this.isInitialized && u) {
        if (this.lastRights !== null && rights !== this.lastRights) {
          this.isRightsChangeEvent.emit({
            account: u,
            level: rights,
          });
        }
        this.lastRights = rights;
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

  onDeactivate(): void {
    this.isDeactivateEvent.emit();
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
