// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { ClientGroupItem } from 'src/app/domain/models/client/client-group-item-class';
import { IClient } from 'src/app/domain/models/client/client-class';
import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

@Injectable({
  providedIn: 'root',
})
export class ClientGroupItemService {
  public addGroup(client: IClient): IClient {
    const newGroupItem = new ClientGroupItem();
    newGroupItem.clientId = client.id || '';
    newGroupItem.validFrom = companyToday();

    client.groupItems = [...client.groupItems, newGroupItem];

    return client;
  }
}
