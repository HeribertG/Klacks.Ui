// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import {
  ICommunication,
  IClient,
  Communication,
} from 'src/app/domain/models/client/client-class';
import { formatPhoneNumber } from 'src/app/shared/helpers/phone.helper';
import { ClientConfigService } from './client-config.service';

@Injectable({
  providedIn: 'root',
})
export class CommunicationService {
  private clientConfigService = inject(ClientConfigService);

  public setCommunication(editClient: IClient) {
    if (!editClient.communications) {
      editClient.communications = [];
    }

    let count = 0;
    editClient.communications.forEach((x) => {
      this.isPhone(x);
      this.isEmail(x);
      x.index = count;
      count++;
    });

    const communicationPhoneList = editClient.communications.filter(
      (x) => x.isPhone === true
    );
    const communicationEmailList = editClient.communications.filter(
      (x) => x.isEmail === true
    );

    if (communicationPhoneList.length === 0) {
      const c = new Communication();
      if (this.clientConfigService.defaultTypePhone() !== -1) {
        c.type = this.clientConfigService.defaultTypePhone();
      } else {
        if (
          this.clientConfigService.communicationTypePhoneList() &&
          this.clientConfigService.communicationTypePhoneList().length > 0
        ) {
          c.type = this.clientConfigService.communicationTypePhoneList()[0].type;
        }
      }

      c.prefix = this.clientConfigService.isSwissPrefixId();
      c.isPhone = true;
      c.index = count++;

      editClient.communications.push(c);
      communicationPhoneList.push(c);
    }
    if (communicationEmailList.length === 0) {
      const c = new Communication();

      if (this.clientConfigService.defaultTypeEmail() !== -1) {
        c.type = this.clientConfigService.defaultTypeEmail();
      } else {
        if (
          this.clientConfigService.communicationTypeEmailList() &&
          this.clientConfigService.communicationTypeEmailList().length > 0
        ) {
          c.type = this.clientConfigService.communicationTypeEmailList()[0].type;
        }
      }
      c.isEmail = true;
      c.index = count++;

      editClient.communications.push(c);
      communicationEmailList.push(c);
    }
    return { communicationPhoneList, communicationEmailList };
  }

  public addPhone(editClient: IClient): IClient {
    const c = new Communication();
    if (this.clientConfigService.defaultTypePhone() !== -1) {
      c.type = this.clientConfigService.defaultTypePhone();
    } else {
      if (this.clientConfigService.communicationTypePhoneList().length > 0) {
        c.type = this.clientConfigService.communicationTypePhoneList()[0].type;
      }
    }

    c.prefix = this.clientConfigService.isSwissPrefixId();
    c.isPhone = true;
    c.index = editClient.communications.length;

    editClient.communications = [...editClient.communications, c];

    return editClient;
  }

  public delPhone(editClient: IClient, index: number): IClient {
    editClient.communications = editClient.communications.filter((_, i) => i !== index);
    return editClient;
  }

  public addEmail(editClient: IClient): IClient {
    const c = new Communication();

    if (this.clientConfigService.defaultTypeEmail() !== -1) {
      c.type = this.clientConfigService.defaultTypeEmail();
    } else {
      if (
        this.clientConfigService.communicationTypeEmailList() &&
        this.clientConfigService.communicationTypeEmailList().length > 0
      ) {
        c.type = this.clientConfigService.communicationTypeEmailList()[0].type;
      }
    }
    c.isEmail = true;
    c.index = editClient.communications.length;

    editClient.communications = [...editClient.communications, c];

    return editClient;
  }

  public delEmail(editClient: IClient, index: number): IClient {
    editClient.communications = editClient.communications.filter((_, i) => i !== index);
    return editClient;
  }

  private isPhone(data: ICommunication) {
    if (this.clientConfigService.communicationTypePhoneList()) {
      const p = this.clientConfigService
        .communicationTypePhoneList()
        .find((x) => +x.type === data.type);
      if (p) {
        if ((p.category === 0) === true) {
          data.isPhone = true;
          data.value = formatPhoneNumber(data.value);
        }
      }
    }
  }

  public isEmail(data: ICommunication) {
    if (this.clientConfigService.communicationTypeEmailList()) {
      const p = this.clientConfigService
        .communicationTypeEmailList()
        .find((x) => +x.type === data.type);
      if (p) {
        if ((p.category === 1) === true) {
          data.isEmail = true;
        }
      }
    }
  }
}
