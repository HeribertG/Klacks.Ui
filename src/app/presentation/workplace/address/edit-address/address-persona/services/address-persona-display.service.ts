// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Display texts of the address persona card: the header with id number, the label key and localized name of the
 * state of the current address, and the weekend check for its datepickers.
 * @param date - Datepicker date checked against the configured weekend days
 */

import { inject, Injectable } from '@angular/core';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';

import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { Language } from 'src/app/domain/models/settings/language.type';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import {
  ADDRESS_PERSONA_COUNTRY_STATE_KEY_PREFIX,
  ADDRESS_PERSONA_ID_NUMBER_KEY,
  ADDRESS_PERSONA_STATE_KEY,
} from '../address-persona.constants';

@Injectable()
export class AddressPersonaDisplayService {
  private dataManagementClientService = inject(DataManagementClientService);
  private translateService = inject(TranslateService);
  private weekConfiguration = inject(WeekConfigurationService);

  get headerTitle(): string {
    const idNumberLabel = this.translateService.instant(ADDRESS_PERSONA_ID_NUMBER_KEY);
    const typeAbbr = this.dataManagementClientService.editClient()?.typeAbbreviation || '';
    const idNumber = this.dataManagementClientService.editClient()?.idNumber || '';
    return `${idNumberLabel} ${typeAbbr}${idNumber}`;
  }

  getCurrentStateName(): string {
    if (!this.dataManagementClientService.editClient()) {
      return '';
    }
    const currentState = this.dataManagementClientService.editClient()!.addresses[
      this.dataManagementClientService.currentAddressIndex()
    ].state;
    if (!currentState) { return ''; }
    const stateToken = this.dataManagementClientService.filteredStateList().find((s) => s.state === currentState);
    if (!stateToken || !stateToken.stateName) { return ''; }
    const currentLang = this.translateService.currentLang as Language;
    return getLocalizedValue(stateToken.stateName, currentLang) || currentState;
  }

  choseCorrectState(): string {
    if (this.dataManagementClientService.editClient()) {
      const country = this.dataManagementClientService.editClient()!.addresses[
        this.dataManagementClientService.currentAddressIndex()
      ].country;
      return ADDRESS_PERSONA_COUNTRY_STATE_KEY_PREFIX + country;
    }
    return ADDRESS_PERSONA_STATE_KEY;
  }

  isWeekend(date: NgbDateStruct): boolean {
    const d = new Date(date.year!, date.month! - 1, date.day!);
    return this.weekConfiguration.isWeekend(d);
  }
}
