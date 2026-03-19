// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API-Service fuer Client-CRUD-Operationen.
 * Nutzt ClientDataMapper fuer die Transformation von Daten vor dem API-Versand.
 */
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import {
  ITruncatedClient,
  IClient,
  IFilter,
  ICommunicationType,
  IClientAttribute,
  ILastChangeMetaData,
  IAddress,
} from 'src/app/domain/models/client/client-class';
import { IAddressValidationResult } from 'src/app/domain/models/client/i-address-validation-result';

import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';
import { ClientDataMapper } from './client-data.mapper';

export interface IClientForReplacement {
  id: string;
  name?: string;
  firstName?: string;
  company?: string;
  legalEntity: boolean;
  idNumber: number;
  groupIds?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DataClientService {
  private httpClient = inject(HttpClient);

  readClientTypeTemplateList() {
    return this.httpClient
      .get<
        IClientAttribute[]
      >(`${environment.baseUrl}Clients/GetClientTypeTemplate`)
      .pipe(retry(3));
  }

  readClientList(filter: IFilter) {
    const mappedFilter = ClientDataMapper.mapFilterDates(filter);

    return this.httpClient
      .post<ITruncatedClient>(
        `${environment.baseUrl}Clients/GetSimpleList`,
        mappedFilter,
      )
      .pipe();
  }

  readChangeList(filter: IFilter) {
    return this.httpClient
      .post<ITruncatedClient>(
        `${environment.baseUrl}Clients/ChangeList`,
        filter,
      )
      .pipe(retry(3));
  }

  getClient(id: string) {
    return this.httpClient
      .get<IClient>(`${environment.baseUrl}Clients/` + id)
      .pipe(retry(3));
  }

  getStateTokenList(value: boolean) {
    return this.httpClient
      .get<
        StateCountryToken[]
      >(`${environment.baseUrl}Clients/GetStateTokenList?isSelected=` + value)
      .pipe();
  }

  findClient(company: string, name: string, firstName: string) {
    return this.httpClient
      .get<
        IClient[]
      >(`${environment.baseUrl}Clients/FindClient/${company}/${name}/${firstName}/`)
      .pipe(retry(3));
  }

  updateClient(value: IClient) {
    const mapped = ClientDataMapper.mapForUpdate(value);

    return this.httpClient
      .put<IClient>(`${environment.baseUrl}Clients/`, mapped)
      .pipe(retry(3));
  }

  addClient(value: IClient) {
    const mapped = ClientDataMapper.mapForCreate(value);

    return this.httpClient
      .post<IClient>(`${environment.baseUrl}Clients/`, mapped)
      .pipe();
  }

  deleteClient(id: string) {
    return this.httpClient
      .delete<IClient>(`${environment.baseUrl}Clients/` + id)
      .pipe();
  }

  readCommunicationTypeList() {
    return this.httpClient
      .get<
        ICommunicationType[]
      >(`${environment.baseUrl}Communications/CommunicationTypes/`)
      .pipe();
  }

  getLastChangeMetaData() {
    return this.httpClient
      .get<ILastChangeMetaData>(
        `${environment.baseUrl}Clients/LastChangeMetaData/`,
      )
      .pipe();
  }

  countIdNumber() {
    return this.httpClient
      .get<number>(`${environment.baseUrl}Clients/Count`)
      .pipe();
  }

  readClientAddressList(id: string) {
    return this.httpClient
      .get<
        IAddress[]
      >(`${environment.baseUrl}Addresses/ClientAddressList/` + id)
      .pipe();
  }

  getClientsForReplacement() {
    return this.httpClient
      .get<IClientForReplacement[]>(`${environment.baseUrl}Clients/ForReplacement`)
      .pipe(retry(3));
  }

  validateAddress(address: IAddress) {
    return this.httpClient
      .post<IAddressValidationResult>(
        `${environment.baseUrl}Addresses/Validate`,
        address,
      )
      .pipe();
  }
}
