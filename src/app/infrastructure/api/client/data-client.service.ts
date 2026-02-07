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

import { unformatPhoneNumber } from 'src/app/shared/helpers/phone.helper';
import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';

export interface IClientForReplacement {
  id: string;
  name?: string;
  firstName?: string;
  company?: string;
  legalEntity: boolean;
  idNumber: number;
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
    this.setCorrectDateFilter(filter);

    return this.httpClient
      .post<ITruncatedClient>(
        `${environment.baseUrl}Clients/GetSimpleList`,
        filter,
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

  private setCorrectDateFilter(value: IFilter) {
    if (value.scopeFrom) {
      value.scopeFrom = dateWithLocalTimeCorrection(new Date(value.scopeFrom));
    } else {
      value.scopeFrom = undefined;
    }

    if (value.scopeUntil) {
      value.scopeUntil = dateWithLocalTimeCorrection(
        new Date(value.scopeUntil),
      );
    } else {
      value.scopeUntil = undefined;
    }
  }

  private setCorrectDate(value: IClient) {
    if (value.birthdate) {
      value.birthdate = dateWithLocalTimeCorrection(new Date(value.birthdate))!;
    } else {
      value.birthdate = undefined;
    }

    if (value.membership?.validFrom) {
      value.membership.validFrom = dateWithLocalTimeCorrection(
        new Date(value.membership.validFrom),
      )!;
    }

    if (value.membership?.validUntil) {
      value.membership.validUntil = dateWithLocalTimeCorrection(
        new Date(value.membership.validUntil),
      )!;
    } else if (value.membership) {
      value.membership.validUntil = undefined;
    }

    value.addresses.forEach((x) => {
      x.validFrom = dateWithLocalTimeCorrection(x.validFrom)!;
    });

    value.clientContracts.forEach((x) => {
      if (x.fromDate) {
        x.fromDate = dateWithLocalTimeCorrection(new Date(x.fromDate))!;
      }

      if (x.untilDate) {
        x.untilDate = dateWithLocalTimeCorrection(new Date(x.untilDate))!;
      }
    });

    value.groupItems.forEach((x) => {
      if (x.validFrom) {
        x.validFrom = dateWithLocalTimeCorrection(new Date(x.validFrom))!;
      }

      if (x.validUntil) {
        x.validUntil = dateWithLocalTimeCorrection(new Date(x.validUntil))!;
      }
    });
  }

  private setCorrectGender(value: IClient) {
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

    value.clientContracts.forEach((x) => {
      delete x.id;
      delete x.clientId;
    });

    value.groupItems.forEach((x) => {
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

    value.clientContracts.forEach((x) => {
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
