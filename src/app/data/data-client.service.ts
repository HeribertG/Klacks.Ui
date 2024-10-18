import { Injectable } from '@angular/core';
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
} from '../core/client-class';

import {
  unformatPhoneNumber,
  transformNgbDateStructToDate,
  isNgbDateStructOk,
  dateWithLocalTimeCorrection,
} from '../helpers/format-helper';
import { StateCountryToken } from '../core/calendar-rule-class';
import { GenderEnum } from '../helpers/enums/client-enum';

@Injectable({
  providedIn: 'root',
})
export class DataClientService {
  constructor(private httpClient: HttpClient) {}

  readClientTypeTemplateList() {
    return this.httpClient
      .get<IClientAttribute[]>(
        `${environment.baseUrl}Clients/GetClientTypeTemplate`
      )
      .pipe(retry(3));
  }

  readClientList(filter: IFilter) {
    this.setCorrectDatFilter(filter);

    return this.httpClient
      .post<ITruncatedClient>(
        `${environment.baseUrl}Clients/GetSimpleList`,
        filter
      )
      .pipe();
  }

  readChangeList(filter: IFilter) {
    return this.httpClient
      .post<ITruncatedClient>(
        `${environment.baseUrl}Clients/ChangeList`,
        filter
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
      .get<StateCountryToken[]>(
        `${environment.baseUrl}Clients/GetStateTokenList?isSelected=` + value
      )
      .pipe();
  }

  findClient(company: string, name: string, firstName: string) {
    return this.httpClient
      .get<IClient[]>(
        `${environment.baseUrl}Clients/FindClient/${company}/${name}/${firstName}/`
      )
      .pipe(retry(3));
  }

  updateClient(value: IClient) {
    this.setCorrectDate(value);
    this.deleteUnnecessaryIds(value);
    this.deleteUnnecessaryCommunication(value);
    this.UnformatPhoneNumber(value);
    this.deleteUnnecessaryAnnotations(value);

    return this.httpClient
      .put<IClient>(`${environment.baseUrl}Clients/`, value)
      .pipe(retry(3));
  }

  addClient(value: IClient) {
    this.setCorrectGender(value);
    this.setCorrectDate(value);
    this.deleteIds(value);
    this.deleteUnnecessaryCommunication(value);
    this.UnformatPhoneNumber(value);
    this.deleteUnnecessaryAnnotations(value);

    return this.httpClient
      .post<IClient>(`${environment.baseUrl}Clients/`, value)
      .pipe();
  }

  deleteClient(id: string) {
    return this.httpClient
      .delete<IClient>(`${environment.baseUrl}Clients/` + id)
      .pipe();
  }

  readCommunicationTypeList() {
    return this.httpClient
      .get<ICommunicationType[]>(
        `${environment.baseUrl}Communications/CommunicationTypes/`
      )
      .pipe();
  }

  getLastChangeMetaData() {
    return this.httpClient
      .get<ILastChangeMetaData>(
        `${environment.baseUrl}Clients/LastChangeMetaData/`
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
      .get<IAddress[]>(
        `${environment.baseUrl}Addresses/ClientAddressList/` + id
      )
      .pipe();
  }

  countNewEntries() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getUTCFullYear();
    const str = `${year}-${month + 1}-${1}`;
    const from = new Date(str).toUTCString();

    return this.httpClient
      .get<number>(`${environment.baseUrl}Clients/NewEntries/` + from)
      .pipe();
  }

  private setCorrectDatFilter(value: IFilter) {
    if (isNgbDateStructOk(value!.internalScopeFrom)) {
      value.scopeFrom = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalScopeFrom)
      );
    } else {
      value.scopeFrom = undefined;
    }

    if (isNgbDateStructOk(value!.internalScopeUntil)) {
      value.scopeUntil = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalScopeUntil)
      );
    } else {
      value.scopeUntil = undefined;
    }
  }

  private setCorrectDate(value: IClient) {
    if (isNgbDateStructOk(value!.internalBirthdate)) {
      value.birthdate = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalBirthdate)
      )!;
    } else {
      value.birthdate = undefined;
    }

    if (isNgbDateStructOk(value.membership?.internalValidFrom)) {
      value.membership!.validFrom = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value.membership!.internalValidFrom)
      )!;
    }
    if (isNgbDateStructOk(value.membership!.internalValidUntil)) {
      value.membership!.validUntil = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value.membership!.internalValidUntil)
      )!;
    } else {
      value.membership!.validUntil = undefined;
    }

    value.addresses.forEach((x) => {
      x.validFrom = dateWithLocalTimeCorrection(x.validFrom)!;
    });
  }

  private setCorrectGender(value: IClient) {
    // switch (value.gender.toString()) {
    //   case 'GenderEnum.female':
    //     value.gender = GenderEnum.female;
    //     break;
    //   case 'GenderEnum.male':
    //     value.gender = GenderEnum.male;
    //     break;
    //   case 'GenderEnum.legalEntity':
    //     value.gender = GenderEnum.legalEntity;
    //     break;
    // }
    value.gender = Number(value.gender);
  }

  private deleteIds(value: IClient) {
    delete value.id;
    delete value.membership!.id;
    delete value.membership!.clientId;
    value.addresses.forEach((x) => {
      delete x.id;
      delete x.clientId;
    });
    value.annotations.forEach((x) => {
      delete x.id;
      delete x.clientId;
    });

    value.communications.forEach((x) => {
      delete x.id;
      delete x.clientId;
    });
  }
  private deleteUnnecessaryIds(value: IClient) {
    value.addresses.forEach((x) => {
      if (x.id === '') {
        delete x.id;
        delete x.clientId;
      }
    });
    value.communications.forEach((x) => {
      if (x.id === '') {
        delete x.id;
        delete x.clientId;
      }
    });

    value.annotations.forEach((x) => {
      if (x.id === '') {
        delete x.id;
        delete x.clientId;
      }
    });
  }

  private deleteUnnecessaryCommunication(value: IClient) {
    for (let i = value.communications.length - 1; i > -1; i--) {
      const x = value.communications[i];

      if (x.value === '') {
        value.communications.splice(i, 1);
      }
    }
  }
  private UnformatPhoneNumber(value: IClient) {
    for (let i = value.communications.length - 1; i > -1; i--) {
      const x = value.communications[i];

      if (x.isPhone) {
        x.value = unformatPhoneNumber(x.value);
      }
    }
  }
  private deleteUnnecessaryAnnotations(value: IClient) {
    for (let i = value.annotations.length - 1; i > -1; i--) {
      const x = value.annotations[i];

      if (x.note === '') {
        value.annotations.splice(i, 1);
      }
    }
  }
}
