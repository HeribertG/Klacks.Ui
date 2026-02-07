import { Injectable } from '@angular/core';
import { ClientGroupItem } from 'src/app/domain/models/client/client-group-item-class';
import { IClient } from 'src/app/domain/models/client/client-class';

@Injectable({
  providedIn: 'root',
})
export class ClientGroupItemService {
  public addGroup(client: IClient): IClient {
    const newGroupItem = new ClientGroupItem();
    newGroupItem.clientId = client.id || '';
    newGroupItem.validFrom = new Date();

    client.groupItems = [...client.groupItems, newGroupItem];

    return client;
  }
}
