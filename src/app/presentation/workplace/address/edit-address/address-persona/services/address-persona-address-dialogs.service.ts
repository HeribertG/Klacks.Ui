// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Address dialogs of the address persona card: the address type dialog (valid from, client and address type), the
 * new address dialog and the address list, plus the address type names and the types the client type allows.
 * @param content - Dialog template opened in the modal
 * @param index - Address type whose name is shown
 * @param addressId - Id of the address chosen in the address list
 */

import { inject, Injectable, TemplateRef } from '@angular/core';
import { NgbDateStruct, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';

import { DomainMessages } from 'src/app/domain/constants/messages';
import { AddressTypeEnum } from 'src/app/domain/enums/client-enum';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import {
  findDisallowedAddressTypes,
  getAllowedAddressTypes,
  isAddressTypeAllowed,
} from 'src/app/domain/helpers/address-type-rules.helper';
import { Address } from 'src/app/domain/models/client/client-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/presentation/helpers/ngb-date.helper';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  ADDRESS_PERSONA_ADDRESS_LIST_DIALOG_OPTIONS,
  ADDRESS_PERSONA_DIALOG_OPTIONS,
  ADDRESS_TYPE_LIST_SEPARATOR,
  ADDRESS_TYPE_NOT_ALLOWED_KEY,
} from '../address-persona.constants';
import { AddressPersonaStateService } from './address-persona-state.service';

@Injectable()
export class AddressPersonaAddressDialogsService {
  private dataManagementClientService = inject(DataManagementClientService);
  private ngbModal = inject(NgbModal);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private state = inject(AddressPersonaStateService);

  editClientType = 0;
  addressType = 0;
  addressValidFrom: NgbDateStruct | undefined;

  newAddressType = 0;
  newAddressValidFrom: NgbDateStruct = transformDateToNgbDateStruct(companyToday())!;

  get allowedAddressTypes(): AddressTypeEnum[] {
    const client = this.dataManagementClientService.editClient();
    return client ? getAllowedAddressTypes(+client.type) : [];
  }

  onAddressTypeName(index: number): string {
    switch (index) {
      case 0: return DomainMessages.ADDRES_TYPE0_NAME;
      case 1: return DomainMessages.ADDRES_TYPE1_NAME;
      case 2: return DomainMessages.ADDRES_TYPE2_NAME;
    }
    return '';
  }

  openAddressType(content: TemplateRef<unknown>): void {
    const tmpDate = this.dataManagementClientService.editClient()!.addresses[
      this.dataManagementClientService.currentAddressIndex()
    ].validFrom;
    this.editClientType = +this.dataManagementClientService.editClient()!.type;
    this.addressType = +this.dataManagementClientService.editClient()!.addresses[
      this.dataManagementClientService.currentAddressIndex()
    ].type;
    this.addressValidFrom = transformDateToNgbDateStruct(tmpDate);
    this.ngbModal
      .open(content, ADDRESS_PERSONA_DIALOG_OPTIONS)
      .result.then(
        () => {
          this.dataManagementClientService.editClient()!.addresses[
            this.dataManagementClientService.currentAddressIndex()
          ].validFrom = transformNgbDateStructToDate(this.addressValidFrom)!;
          this.applyClientType(+this.editClientType);
          this.dataManagementClientService.editClient()!.addresses[
            this.dataManagementClientService.currentAddressIndex()
          ].type = +this.addressType;
          this.dataManagementClientService.refreshClientState();
          this.state.notifyChanging(true);
        },
        () => {}
      );
  }

  openNewAddress(content: TemplateRef<unknown>): void {
    const currentType = +this.dataManagementClientService.editClient()!.addresses[
      this.dataManagementClientService.currentAddressIndex()
    ].type;
    this.newAddressType = isAddressTypeAllowed(+this.dataManagementClientService.editClient()!.type, currentType)
      ? currentType
      : AddressTypeEnum.customer;
    this.newAddressValidFrom = transformDateToNgbDateStruct(companyToday())!;
    this.ngbModal
      .open(content, ADDRESS_PERSONA_DIALOG_OPTIONS)
      .result.then(
        () => {
          const c = new Address();
          c.isScoped = true;
          c.type = this.newAddressType;
          c.validFrom = transformNgbDateStructToDate(this.newAddressValidFrom)!;
          this.dataManagementClientService.editClient()!.addresses.push(c);
          this.dataManagementClientService.clientEditService.currentAddressIndex.set(
            this.dataManagementClientService.editClient()!.addresses.length - 1
          );
          this.state.notifyChanging(true);
        },
        () => {}
      );
  }

  openAddressList(content: TemplateRef<unknown>): void {
    this.dataManagementClientService.readClientAddressListWithoutQueryFilter();
    this.ngbModal
      .open(content, ADDRESS_PERSONA_ADDRESS_LIST_DIALOG_OPTIONS)
      .result.then(() => {}, () => {});
  }

  onChangingAddress(addressId: string): void {
    const address = this.dataManagementClientService.editClient()!.addresses.find(
      (x) => x.id === addressId.toString()
    );
    if (address!.id === addressId.toString()) {
      this.dataManagementClientService.reReadAddress();
      this.state.notifyChanging(true);
    }
  }

  private applyClientType(newType: number): void {
    const client = this.dataManagementClientService.editClient()!;
    if (newType === +client.type) { return; }
    const blocked = findDisallowedAddressTypes(
      newType,
      client.addresses.filter((address) => !address.isDeleted),
    );
    if (blocked.length > 0) {
      const types = blocked.map((type) => this.onAddressTypeName(type)).join(ADDRESS_TYPE_LIST_SEPARATOR);
      this.toastShowService.showError(this.translateService.instant(ADDRESS_TYPE_NOT_ALLOWED_KEY, { types }));
      return;
    }
    client.type = newType;
  }
}
