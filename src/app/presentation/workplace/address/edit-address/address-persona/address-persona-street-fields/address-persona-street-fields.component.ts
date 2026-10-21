// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Address lines of a secondary address and the street lines of the address persona card; the second and third
 * street lines open through their buttons.
 * @param isMainAddress - Whether the current address is the main address of the client
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';

import { AddressPersonaStateService } from '../services/address-persona-state.service';

@Component({
  selector: 'app-address-persona-street-fields',
  templateUrl: './address-persona-street-fields.component.html',
  styleUrls: ['./address-persona-street-fields.component.scss'],
  standalone: true,
  imports: [FormField, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPersonaStreetFieldsComponent {
  readonly isMainAddress = input.required<boolean>();

  protected readonly state = inject(AddressPersonaStateService);
}
