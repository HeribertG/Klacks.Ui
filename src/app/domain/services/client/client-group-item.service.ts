import { Injectable } from '@angular/core';
import {
  IClientGroupItem,
  ClientGroupItem,
} from 'src/app/domain/models/client-group-item-class';
import { transformDateToNgbDateStruct } from 'src/app/shared/helpers/ngb-date.helper';
import { IClient } from 'src/app/domain/models/client-class';

@Injectable({
  providedIn: 'root',
})
export class ClientGroupItemService {
  public setDateStructs(groupItems: IClientGroupItem[]): void {
    groupItems.forEach((groupItem) => {
      if (groupItem.validFrom) {
        groupItem.internalValidFrom = transformDateToNgbDateStruct(
          groupItem.validFrom
        );
      }
      if (groupItem.validUntil) {
        groupItem.internalValidUntil = transformDateToNgbDateStruct(
          groupItem.validUntil
        );
      }
    });
  }

  public addGroup(client: IClient): IClient {
    const newGroupItem = new ClientGroupItem();
    newGroupItem.clientId = client.id || '';
    const today = new Date();
    newGroupItem.validFrom = today;
    newGroupItem.internalValidFrom = transformDateToNgbDateStruct(today);

    client.groupItems = [...client.groupItems, newGroupItem];

    return client;
  }
}
