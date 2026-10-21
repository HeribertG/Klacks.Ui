// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Body of the address type dialog of the address persona card: valid-from date of the current address and, when
 * several client types exist, the client type.
 * @param modal - Active modal of the dialog, closed on save and dismissed on cancel
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { NgbActiveModal, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { AddressPersonaAddressDialogsService } from '../services/address-persona-address-dialogs.service';

@Component({
  selector: 'app-address-persona-address-type-dialog',
  templateUrl: './address-persona-address-type-dialog.component.html',
  styleUrls: ['./address-persona-address-type-dialog.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, NgbDatepickerModule, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPersonaAddressTypeDialogComponent {
  readonly modal = input.required<NgbActiveModal>();

  protected readonly dialogs = inject(AddressPersonaAddressDialogsService);
  protected readonly dataManagementClientService = inject(DataManagementClientService);
  protected readonly faCalendar = faCalendar;
}
