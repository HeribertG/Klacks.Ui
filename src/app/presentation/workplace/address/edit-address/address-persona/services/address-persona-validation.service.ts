// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Required-field validity of the address persona card: company for a legal entity, first name, name and gender for
 * a person, zip, city and country of the current address for both. Undefined means the field is not validated.
 */

import { inject, Injectable, signal } from '@angular/core';

import { GenderEnum } from 'src/app/domain/enums/client-enum';
import { IClient } from 'src/app/domain/models/client/client-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';

@Injectable()
export class AddressPersonaValidationService {
  private dataManagementClientService = inject(DataManagementClientService);

  readonly isCompanyValid = signal<boolean | undefined>(undefined);
  readonly isFirstNameValid = signal<boolean | undefined>(undefined);
  readonly isNameValid = signal<boolean | undefined>(undefined);
  readonly isGenderValid = signal<boolean | undefined>(undefined);
  readonly isZipValid = signal<boolean | undefined>(undefined);
  readonly isCityValid = signal<boolean | undefined>(undefined);
  readonly isCountryValid = signal<boolean | undefined>(undefined);

  calcValidation(): void {
    const client = this.dataManagementClientService.editClient();
    if (!client) { return; }
    if (client.legalEntity) {
      this.calcValidationLegalEntity(client);
    } else {
      this.calcValidationNormalClient(client);
    }
  }

  private calcValidationLegalEntity(client: IClient): void {
    this.isCompanyValid.set(this.isFilled(client.company));
    this.calcAddressValidation(client);
    this.isFirstNameValid.set(undefined);
    this.isNameValid.set(undefined);
    this.isGenderValid.set(undefined);
  }

  private calcValidationNormalClient(client: IClient): void {
    this.isFirstNameValid.set(this.isFilled(client.firstName));
    this.isNameValid.set(this.isFilled(client.name));
    this.isGenderValid.set(
      client.gender === GenderEnum.female ||
      client.gender === GenderEnum.male ||
      client.gender === GenderEnum.intersexuality,
    );
    this.calcAddressValidation(client);
    this.isCompanyValid.set(undefined);
  }

  private calcAddressValidation(client: IClient): void {
    const currentAddress = client.addresses[this.dataManagementClientService.currentAddressIndex()];
    if (currentAddress) {
      this.isZipValid.set(this.isFilled(currentAddress.zip));
      this.isCityValid.set(this.isFilled(currentAddress.city));
      this.isCountryValid.set(this.isFilled(currentAddress.country));
    }
  }

  private isFilled(value: string | undefined): boolean {
    return !!value && value.trim() !== '';
  }
}
