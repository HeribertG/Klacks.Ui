// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Company, gender, legal entity flag and contact person heading of the main address of the address persona card.
 * @param isMainAddress - Whether the current address is the main address of the client
 * @param hasClientId - Whether the client is stored, so missing required fields are marked before they are touched
 * @param isLegalEntityClient - Whether the edited client is a legal entity, which shows the company field
 */

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';

import { AddressPersonaStateService } from '../services/address-persona-state.service';
import { AddressPersonaValidationService } from '../services/address-persona-validation.service';

@Component({
  selector: 'app-address-persona-entity-fields',
  templateUrl: './address-persona-entity-fields.component.html',
  styleUrls: ['./address-persona-entity-fields.component.scss'],
  standalone: true,
  imports: [NgClass, FormsModule, FormField, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPersonaEntityFieldsComponent {
  readonly isMainAddress = input.required<boolean>();
  readonly hasClientId = input.required<boolean>();
  readonly isLegalEntityClient = input.required<boolean>();

  protected readonly state = inject(AddressPersonaStateService);
  protected readonly validation = inject(AddressPersonaValidationService);
}
