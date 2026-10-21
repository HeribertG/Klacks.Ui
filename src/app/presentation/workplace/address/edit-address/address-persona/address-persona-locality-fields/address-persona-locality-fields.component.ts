// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Zip, city, state and country of the current address of the address persona card; leaving the zip looks up its city.
 * @param hasClientId - Whether the client is stored, so missing required fields are marked before they are touched
 * @param stateLabelKey - Translation key of the state label, specific to the country of the current address
 * @param stateTooltip - Localized name of the state of the current address
 * @param currentState - State of the current address, preselected in the state list
 * @param currentCountry - Country of the current address, preselected in the country list
 * @param countries - Countries offered in the country list
 * @param currentLang - Language the country names are shown in
 */

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { ICountry } from 'src/app/domain/models/client/client-class';
import { Language } from 'src/app/domain/models/settings/language.type';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { AddressPersonaFormSyncService } from '../services/address-persona-form-sync.service';
import { AddressPersonaStateService } from '../services/address-persona-state.service';
import { AddressPersonaValidationService } from '../services/address-persona-validation.service';

@Component({
  selector: 'app-address-persona-locality-fields',
  templateUrl: './address-persona-locality-fields.component.html',
  styleUrls: ['./address-persona-locality-fields.component.scss'],
  standalone: true,
  imports: [NgClass, FormsModule, FormField, TranslateModule, NgbTooltipModule, FallbackPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPersonaLocalityFieldsComponent {
  readonly hasClientId = input.required<boolean>();
  readonly stateLabelKey = input.required<string>();
  readonly stateTooltip = input.required<string>();
  readonly currentState = input<string>();
  readonly currentCountry = input<string>();
  readonly countries = input.required<ICountry[]>();
  readonly currentLang = input.required<Language>();

  protected readonly dataManagementClientService = inject(DataManagementClientService);
  protected readonly state = inject(AddressPersonaStateService);
  protected readonly validation = inject(AddressPersonaValidationService);
  protected readonly formSync = inject(AddressPersonaFormSyncService);
}
