// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Title, first name, second name, name and maiden name of the main address of the address persona card; the second
 * name and maiden name lines open through their buttons and stay closed for a legal entity.
 * @param isMainAddress - Whether the current address is the main address of the client
 * @param hasClientId - Whether the client is stored, so missing required fields are marked before they are touched
 */

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';

import { AddressPersonaStateService } from '../services/address-persona-state.service';
import { AddressPersonaValidationService } from '../services/address-persona-validation.service';

@Component({
  selector: 'app-address-persona-name-fields',
  templateUrl: './address-persona-name-fields.component.html',
  styleUrls: ['./address-persona-name-fields.component.scss'],
  standalone: true,
  imports: [NgClass, FormField, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPersonaNameFieldsComponent {
  readonly isMainAddress = input.required<boolean>();
  readonly hasClientId = input.required<boolean>();

  protected readonly state = inject(AddressPersonaStateService);
  protected readonly validation = inject(AddressPersonaValidationService);

  protected get addFirstNameLine2(): boolean {
    return this.state.addFirstNameLine2();
  }

  protected set addFirstNameLine2(value: boolean) {
    this.state.addFirstNameLine2.set(value);
  }

  protected get addNameLine2(): boolean {
    return this.state.addNameLine2();
  }

  protected set addNameLine2(value: boolean) {
    this.state.addNameLine2.set(value);
  }

  protected isLegalEntity(): boolean {
    return this.state.isLegalEntity();
  }
}
