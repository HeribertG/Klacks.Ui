// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Read-only list row for one ERP import token.
 * @param data - Token metadata (name, prefix, expiry, last usage)
 * @param deleteEvent - Emits the token when the revoke button is clicked
 */

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IErpImportToken } from 'src/app/domain/models/settings/erp-import-token';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-erp-drop-point-token-row',
  standalone: true,
  imports: [DatePipe, TranslateModule, TrashIconRedComponent],
  templateUrl: './erp-drop-point-token-row.component.html',
  styleUrls: ['./erp-drop-point-token-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErpDropPointTokenRowComponent {
  readonly data = input.required<IErpImportToken>();
  readonly deleteEvent = output<IErpImportToken>();

  onClickDelete(): void {
    this.deleteEvent.emit(this.data());
  }
}
