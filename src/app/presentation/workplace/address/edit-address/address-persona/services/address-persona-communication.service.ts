// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Phone and email handling of the address persona card: adds and removes entries, formats typed phone numbers and
 * writes changed communication fields into the edited client.
 * @param index - Position of the entry in the phone or email list
 * @param event - DOM event whose element carries the changed value
 * @param data - Communication entry to remove
 */

import { inject, Injectable } from '@angular/core';

import { ICommunication } from 'src/app/domain/models/client/client-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { formatPhoneNumber } from 'src/app/shared/helpers/phone.helper';
import { AddressPersonaStateService } from './address-persona-state.service';

@Injectable()
export class AddressPersonaCommunicationService {
  private dataManagementClientService = inject(DataManagementClientService);
  private state = inject(AddressPersonaStateService);

  isPhoneValueSeals = false;

  onChangePhoneType(index: number, event: Event): void {
    this.updateCommunication(
      this.dataManagementClientService.communicationPhoneList(), index,
      { isPhone: true, type: 0 }, 'type', +this.readValue(event)
    );
  }

  onChangePhonePrefix(index: number, event: Event): void {
    this.updateCommunication(
      this.dataManagementClientService.communicationPhoneList(), index,
      { isPhone: true, type: 0 }, 'prefix', this.readValue(event)
    );
  }

  onChangePhoneValue(index: number, event: Event): void {
    if (this.isPhoneValueSeals) { return; }
    this.updateCommunication(
      this.dataManagementClientService.communicationPhoneList(), index,
      { isPhone: true }, 'value', this.readValue(event)
    );
  }

  onKeyupPhoneNumber(pos: number, event: KeyboardEvent): void {
    const input = event.srcElement as HTMLInputElement;
    const formatted = formatPhoneNumber(input.value);
    input.value = formatted;
    const phoneList = this.dataManagementClientService.communicationPhoneList();
    if (phoneList[pos]) {
      phoneList[pos].value = formatted;
    }
  }

  onChangeEmailValue(index: number, event: Event): void {
    this.updateCommunication(
      this.dataManagementClientService.communicationEmailList(), index,
      { isEmail: true }, 'value', this.readValue(event)
    );
  }

  onChangeEmailType(index: number, event: Event): void {
    this.updateCommunication(
      this.dataManagementClientService.communicationEmailList(), index,
      { isEmail: true }, 'type', +this.readValue(event)
    );
  }

  onClickAddPhone(): void {
    this.dataManagementClientService.addPhone();
  }

  onClickDelPhone(data: ICommunication): void {
    this.dataManagementClientService.delPhone(data.index);
    this.state.notifyChanging(true);
  }

  onClickAddEmail(): void {
    this.dataManagementClientService.addEmail();
  }

  onClickDelEmail(data: ICommunication): void {
    this.dataManagementClientService.delEmail(data.index);
    this.state.notifyChanging(true);
  }

  private readValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  private updateCommunication(
    list: ICommunication[], index: number,
    defaults: Partial<ICommunication>, field: keyof ICommunication, value: string | number
  ): void {
    if (!value && value !== 0) { return; }
    const tmp = list[index];
    let data = this.dataManagementClientService.editClient()!.communications.find((x) => x.index === tmp.index);
    if (!data) {
      data = tmp;
      data.index = index;
      Object.assign(data, defaults);
      this.dataManagementClientService.editClient()!.communications.push(data);
    }
    (data as Record<keyof ICommunication, unknown>)[field] = value;
    this.state.notifyChanging(true);
  }
}
