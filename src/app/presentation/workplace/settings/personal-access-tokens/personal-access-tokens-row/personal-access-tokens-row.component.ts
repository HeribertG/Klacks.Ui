// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Read-only list row for one personal access token.
 * @param data - Token metadata (name, prefix, created, expiry, last usage)
 * @param isDeleteEvent - Emits the token when the revoke button is clicked
 */

import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';

import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IPersonalAccessToken } from 'src/app/domain/models/settings/personal-access-token';
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

  @Input() data!: IPersonalAccessToken;
  @Output() isDeleteEvent = new EventEmitter<IPersonalAccessToken>();

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data);
  }
}
