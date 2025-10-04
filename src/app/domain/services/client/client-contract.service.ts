import { Injectable } from '@angular/core';
import {
  IClient,
  IClientContract,
  ClientContract,
} from 'src/app/domain/models/client-class';
import { transformDateToNgbDateStruct } from 'src/app/domain/helpers/format-helper';

@Injectable({
  providedIn: 'root',
})
export class ClientContractService {
  public setDateStructs(contracts: IClientContract[]): void {
    contracts.forEach((contract) => {
      contract.internalFromDate = transformDateToNgbDateStruct(
        contract.fromDate
      );
      if (contract.untilDate) {
        contract.internalUntilDate = transformDateToNgbDateStruct(
          contract.untilDate
        );
      }
    });
  }

  public addContract(client: IClient): IClient {
    const newContract = new ClientContract();
    newContract.clientId = client.id || '';
    const today = new Date();
    newContract.fromDate = today;
    newContract.internalFromDate = transformDateToNgbDateStruct(today);

    client.clientContracts = [...client.clientContracts, newContract];

    return client;
  }

  public removeContract(client: IClient, index: number): IClient {
    client.clientContracts = client.clientContracts.filter((_, i) => i !== index);
    return client;
  }
}
