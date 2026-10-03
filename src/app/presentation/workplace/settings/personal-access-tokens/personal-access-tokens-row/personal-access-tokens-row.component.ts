// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read-only list row for one personal access token.
 * @param data - Token metadata (name, prefix, access mode, created, expiry, last usage)
 * @param accessModeLabelKey - Only an explicit Read shows "read only"; anything else shows the wider Write label
 * @param isDeleteEvent - Emits the token when the revoke button is clicked
 */

import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';

import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  IPersonalAccessToken,
  PERSONAL_ACCESS_TOKEN_ACCESS_MODE,
} from 'src/app/domain/models/settings/personal-access-token';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-personal-access-tokens-row',
  standalone: true,
  imports: [DatePipe, TranslateModule, TrashIconRedComponent],
  templateUrl: './personal-access-tokens-row.component.html',
  styleUrls: ['./personal-access-tokens-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalAccessTokensRowComponent {

  readonly data = input.required<IPersonalAccessToken>();
  readonly isDeleteEvent = output<IPersonalAccessToken>();

  readonly accessModeLabelKey = computed(() =>
    this.data().accessMode === PERSONAL_ACCESS_TOKEN_ACCESS_MODE.READ
      ? 'setting.personal-access-tokens.access-mode.read'
      : 'setting.personal-access-tokens.access-mode.write'
  );

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data());
  }
}
