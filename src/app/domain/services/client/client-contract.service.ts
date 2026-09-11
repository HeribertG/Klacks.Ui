// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import {
  IClient,
  ClientContract,
} from 'src/app/domain/models/client/client-class';
import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

@Injectable({
  providedIn: 'root',
})
export class ClientContractService {
  public addContract(client: IClient): IClient {
    const newContract = new ClientContract();
    newContract.clientId = client.id || '';
    newContract.fromDate = companyToday();

    client.clientContracts = [...client.clientContracts, newContract];

    return client;
  }

  public removeContract(client: IClient, index: number): IClient {
    client.clientContracts = client.clientContracts.filter((_, i) => i !== index);
    return client;
  }
}
