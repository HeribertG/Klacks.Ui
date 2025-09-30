import { inject, Injectable } from '@angular/core';
import {
  ICommunication,
  IClient,
  Communication,
} from 'src/app/domain/models/client-class';
import { createStringId } from 'src/app/domain/helpers/object-helpers';
import { formatPhoneNumber } from 'src/app/domain/helpers/format-helper';
import { ClientConfigService } from './client-config.service';

@Injectable({
  providedIn: 'root',
})
export class CommunicationService {
  private clientConfigService = inject(ClientConfigService);

  public setCommunication(editClient: IClient) {
    let count = 0;
    editClient.communications.forEach((x) => {
      x.internalId = createStringId();

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

    editClient.communications.push(c);

    return editClient;
  }

  public delPhone(editClient: IClient, index: number): IClient {
    editClient.communications.splice(index, 1);
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

    editClient.communications.push(c);

    return editClient;
  }

  public delEmail(editClient: IClient, index: number): IClient {
    editClient.communications.splice(index, 1);
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
