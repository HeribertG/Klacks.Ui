// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Keeps the persona form and the edited client in sync: loads the client and the current address into the form,
 * switches gender and client type with the legal entity flag, writes every form change back to the client and
 * copies the city found for a zip into the form.
 * @param client - Edited client the form is loaded from and written back to
 * @param idx - Index of the current address of the client
 * @param data - Form values written back to the client and its current address
 */

import { ChangeDetectorRef, effect, inject, Injectable, Injector, untracked } from '@angular/core';

import { EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { IClient } from 'src/app/domain/models/client/client-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { transformDateToNgbDateStruct } from 'src/app/presentation/helpers/ngb-date.helper';
import { AddressPersonaFormModel } from '../address-persona-form-model.interface';
import { AddressPersonaStateService } from './address-persona-state.service';
import { AddressPersonaValidationService } from './address-persona-validation.service';

@Injectable()
export class AddressPersonaFormSyncService {
  private dataManagementClientService = inject(DataManagementClientService);
  private state = inject(AddressPersonaStateService);
  private validation = inject(AddressPersonaValidationService);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  private isFormLoaded = false;
  private prevCountry = '';
  private prevLegalEntity: boolean | null = null;

  connect(): void {
    this.connectClientLoad();
    this.connectAddressSwitch();
    this.connectLegalEntity();
    this.connectWriteBack();
  }

  async onZipFocusout(): Promise<void> {
    try {
      await this.dataManagementClientService.writeCity();
    } catch {
      // Zip has no matching city (e.g. foreign postcode) - address fields are left as typed
    }
    const client = this.dataManagementClientService.editClient();
    const idx = this.dataManagementClientService.currentAddressIndex();
    if (client?.addresses[idx]) {
      this.state.formModel.update(m => ({ ...m, city: client.addresses[idx].city ?? '' }));
    }
    this.validation.calcValidation();
    this.cdr.markForCheck();
  }

  private connectClientLoad(): void {
    effect(() => {
      const isRead = this.dataManagementClientService.isRead();
      const isReset = this.dataManagementClientService.isReset();
      const client = this.dataManagementClientService.editClient();

      if (isRead && client) {
        untracked(() => {
          const birthdate = client.birthdate;
          this.state.birthdateValue.set(birthdate ? transformDateToNgbDateStruct(birthdate) : undefined);
          this.isFormLoaded = false;
          this.loadToForm(client);
          this.dataManagementClientService.filterState();
          this.validation.calcValidation();
          this.isFormLoaded = true;
          queueMicrotask(() => this.cdr.markForCheck());
        });
      }

      if (isReset) {
        untracked(() => {
          queueMicrotask(() => this.state.notifyChanging(false));
        });
      }
    }, { injector: this.injector });
  }

  private connectAddressSwitch(): void {
    effect(() => {
      const idx = this.dataManagementClientService.currentAddressIndex();
      if (!this.isFormLoaded) return;
      untracked(() => {
        const client = this.dataManagementClientService.editClient();
        if (!client) return;
        this.isFormLoaded = false;
        this.loadAddressFields(client, idx);
        this.isFormLoaded = true;
        queueMicrotask(() => this.cdr.markForCheck());
      });
    }, { injector: this.injector });
  }

  private connectLegalEntity(): void {
    effect(() => {
      const legalEntity = this.state.formModel().legalEntity;
      if (!this.isFormLoaded) return;
      if (this.prevLegalEntity !== null && legalEntity !== this.prevLegalEntity) {
        const newGender = legalEntity ? GenderEnum.legalEntity : GenderEnum.female;
        const newType = legalEntity ? EntityTypeEnum.customer : 0;
        this.prevLegalEntity = legalEntity;
        untracked(() => {
          const client = this.dataManagementClientService.editClient();
          if (client) client.type = newType;
          this.state.formModel.update(m => ({ ...m, gender: String(newGender) }));
        });
        return;
      }
      this.prevLegalEntity = legalEntity;
    }, { injector: this.injector });
  }

  private connectWriteBack(): void {
    effect(() => {
      const data = this.state.formModel();
      const isDirty = this.state.personaForm().dirty();
      if (!this.isFormLoaded) return;
      untracked(() => {
        this.syncToService(data);
        if (isDirty) {
          queueMicrotask(() => this.state.notifyChanging(true));
        }
      });
    }, { injector: this.injector });
  }

  private loadToForm(client: IClient): void {
    const idx = this.dataManagementClientService.currentAddressIndex();
    const addr = client.addresses[idx];
    this.state.formModel.set({
      company: client.company ?? '',
      gender: String(client.gender ?? GenderEnum.female),
      legalEntity: client.legalEntity ?? false,
      title: client.title ?? '',
      firstName: client.firstName ?? '',
      secondName: client.secondName ?? '',
      name: client.name ?? '',
      maidenName: client.maidenName ?? '',
      addressLine1: addr?.addressLine1 ?? '',
      addressLine2: addr?.addressLine2 ?? '',
      street: addr?.street ?? '',
      street2: addr?.street2 ?? '',
      street3: addr?.street3 ?? '',
      zip: addr?.zip ?? '',
      city: addr?.city ?? '',
      state: addr?.state ?? '',
      country: addr?.country ?? '',
    });
    this.prevCountry = addr?.country ?? '';
    this.prevLegalEntity = client.legalEntity ?? false;
    this.state.personaForm().reset();
    this.setEnvironmentVariable();
  }

  private loadAddressFields(client: IClient, idx: number): void {
    const addr = client.addresses[idx];
    if (!addr) return;
    this.state.formModel.update(m => ({
      ...m,
      addressLine1: addr.addressLine1 ?? '',
      addressLine2: addr.addressLine2 ?? '',
      street: addr.street ?? '',
      street2: addr.street2 ?? '',
      street3: addr.street3 ?? '',
      zip: addr.zip ?? '',
      city: addr.city ?? '',
      state: addr.state ?? '',
      country: addr.country ?? '',
    }));
    this.prevCountry = addr.country ?? '';
    this.state.personaForm().reset();
    this.assemblyAddress(idx);
    this.dataManagementClientService.filterState();
    this.validation.calcValidation();
  }

  private syncToService(data: AddressPersonaFormModel): void {
    const client = this.dataManagementClientService.editClient();
    if (!client) return;
    const idx = this.dataManagementClientService.currentAddressIndex();

    client.company = data.company;
    client.gender = Number(data.gender);
    client.legalEntity = data.legalEntity;
    client.title = data.title;
    client.firstName = data.firstName;
    client.secondName = data.secondName;
    client.name = data.name;
    client.maidenName = data.maidenName;

    const addr = client.addresses[idx];
    if (addr) {
      addr.addressLine1 = data.addressLine1;
      addr.addressLine2 = data.addressLine2;
      addr.street = data.street;
      addr.street2 = data.street2;
      addr.street3 = data.street3;
      addr.zip = data.zip;
      addr.city = data.city;
      addr.state = data.state;
      addr.country = data.country;

      if (data.country !== this.prevCountry) {
        this.prevCountry = data.country;
        this.dataManagementClientService.filterState();
      }
    }

    this.validation.calcValidation();

    if (!client.id) {
      queueMicrotask(() => this.dataManagementClientService.findClients());
    }
  }

  private setEnvironmentVariable(): void {
    if (this.dataManagementClientService.editClient()?.maidenName) {
      this.state.addNameLine2.set(true);
    }
    if (this.dataManagementClientService.editClient()?.secondName) {
      this.state.addFirstNameLine2.set(true);
    }
    this.assemblyAddress(this.dataManagementClientService.currentAddressIndex());
  }

  private assemblyAddress(index: number): void {
    const client = this.dataManagementClientService.editClient();
    if (client?.addresses[index]?.street2 && client.addresses[index].street2 !== '') {
      this.state.addStreetLine2.set(true);
    }
    if (client?.addresses[index]?.street3 && client.addresses[index].street3 !== '') {
      this.state.addStreetLine3.set(true);
    }
  }
}
