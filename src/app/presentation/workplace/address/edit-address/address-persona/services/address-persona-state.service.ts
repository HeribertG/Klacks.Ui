// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Form state of the address persona card: the signal form of the persona and address fields, the optional lines
 * that are open, the picked birthdate and whether the card may be edited.
 * @param bindings - Read-only input and change output of the card component, bound once from its constructor
 * @param value - Birthdate picked in the datepicker, undefined when it was cleared
 */

import { inject, Injectable, signal } from '@angular/core';
import { disabled, form, maxLength } from '@angular/forms/signals';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { GenderEnum } from 'src/app/domain/enums/client-enum';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { transformNgbDateStructToDate } from 'src/app/presentation/helpers/ngb-date.helper';
import { AddressPersonaBindings } from '../address-persona-bindings.interface';
import { AddressPersonaFormModel } from '../address-persona-form-model.interface';
import { ADDRESS_PERSONA_NAME_MAX_LENGTH, ADDRESS_PERSONA_TITLE_MAX_LENGTH } from '../address-persona.constants';

@Injectable()
export class AddressPersonaStateService {
  private dataManagementClientService = inject(DataManagementClientService);
  private authorizationService = inject(AuthorizationService);
  private bindings!: AddressPersonaBindings;

  readonly addStreetLine2 = signal(false);
  readonly addStreetLine3 = signal(false);
  readonly addFirstNameLine2 = signal(false);
  readonly addNameLine2 = signal(false);
  readonly birthdateValue = signal<NgbDateStruct | undefined>(undefined);

  readonly formModel = signal<AddressPersonaFormModel>({
    company: '',
    gender: String(GenderEnum.female),
    legalEntity: false,
    title: '',
    firstName: '',
    secondName: '',
    name: '',
    maidenName: '',
    addressLine1: '',
    addressLine2: '',
    street: '',
    street2: '',
    street3: '',
    zip: '',
    city: '',
    state: '',
    country: '',
  });

  readonly personaForm = form(this.formModel, (f) => {
    disabled(f, { when: () => this.isDisabled() });
    maxLength(f.company, ADDRESS_PERSONA_NAME_MAX_LENGTH);
    maxLength(f.title, ADDRESS_PERSONA_TITLE_MAX_LENGTH);
    maxLength(f.firstName, ADDRESS_PERSONA_NAME_MAX_LENGTH);
    maxLength(f.secondName, ADDRESS_PERSONA_NAME_MAX_LENGTH);
    maxLength(f.name, ADDRESS_PERSONA_NAME_MAX_LENGTH);
    maxLength(f.maidenName, ADDRESS_PERSONA_NAME_MAX_LENGTH);
  });

  bind(bindings: AddressPersonaBindings): void {
    this.bindings = bindings;
  }

  isDisabled(): boolean {
    return (
      this.bindings.isReadOnly() ||
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.hasPermission(PERMISSIONS.CanEditClients)
    );
  }

  isLegalEntity(): boolean {
    const model = this.formModel();
    return model.legalEntity || Number(model.gender) === GenderEnum.legalEntity;
  }

  notifyChanging(isChanging: boolean): void {
    this.bindings.isChangingEvent.emit(isChanging);
  }

  onBirthdateChange(value: NgbDateStruct | undefined): void {
    this.birthdateValue.set(value);
    const client = this.dataManagementClientService.editClient();
    if (client) {
      client.birthdate = value ? transformNgbDateStructToDate(value) : undefined;
    }
  }
}
