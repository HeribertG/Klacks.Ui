// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Body of the new address dialog of the address persona card: valid-from date and, when the client type allows
 * several, the type of the new address.
 * @param modal - Active modal of the dialog, closed on save and dismissed on cancel
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { NgbActiveModal, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { AddressPersonaAddressDialogsService } from '../services/address-persona-address-dialogs.service';

@Component({
  selector: 'app-address-persona-new-address-dialog',
  templateUrl: './address-persona-new-address-dialog.component.html',
  styleUrls: ['./address-persona-new-address-dialog.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, NgbDatepickerModule, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPersonaNewAddressDialogComponent {
  readonly modal = input.required<NgbActiveModal>();

  protected readonly dialogs = inject(AddressPersonaAddressDialogsService);
  protected readonly faCalendar = faCalendar;
}
