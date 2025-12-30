import { Injectable } from '@angular/core';
import {
  IClient,
  ClientContract,
} from 'src/app/domain/models/client-class';

@Injectable({
  providedIn: 'root',
})
export class ClientContractService {
  public addContract(client: IClient): IClient {
    const newContract = new ClientContract();
    newContract.clientId = client.id || '';
    newContract.fromDate = new Date();

    client.clientContracts = [...client.clientContracts, newContract];

    return client;
  }

  public removeContract(client: IClient, index: number): IClient {
    client.clientContracts = client.clientContracts.filter((_, i) => i !== index);
    return client;
  }
}
