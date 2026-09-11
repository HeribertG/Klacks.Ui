// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure-function mapper for client data before sending to the API.
 * Transforms IClient/IFilter objects without mutating the original.
 * @param value - The client or filter object to transform
 */
import {
  IClient,
  IFilter,
  ICommunication,
  IAnnotation,
  IAddress,
  IClientContract,
} from 'src/app/domain/models/client/client-class';
import { IClientGroupItem } from 'src/app/domain/models/client/client-group-item-class';

import { unformatPhoneNumber } from 'src/app/shared/helpers/phone.helper';
import { toCalendarDateWire } from 'src/app/shared/helpers/calendar-date.helper';

export class ClientDataMapper {
  static mapForUpdate(value: IClient) {
    const withoutEmptyIds = ClientDataMapper.removeEmptyIds(value);
    const withoutEmptyCommunications = ClientDataMapper.removeEmptyCommunications(withoutEmptyIds);
    const withUnformattedPhones = ClientDataMapper.unformatPhoneNumbers(withoutEmptyCommunications);
    const withoutEmptyAnnotations = ClientDataMapper.removeEmptyAnnotations(withUnformattedPhones);
    return ClientDataMapper.mapDates(withoutEmptyAnnotations);
  }

  static mapForCreate(value: IClient) {
    const genderCorrected = ClientDataMapper.correctGender(value);
    const idsStripped = ClientDataMapper.stripAllIds(genderCorrected);
    const withoutEmptyCommunications = ClientDataMapper.removeEmptyCommunications(idsStripped);
    const withUnformattedPhones = ClientDataMapper.unformatPhoneNumbers(withoutEmptyCommunications);
    const withoutEmptyAnnotations = ClientDataMapper.removeEmptyAnnotations(withUnformattedPhones);
    return ClientDataMapper.mapDates(withoutEmptyAnnotations);
  }

  static mapFilterDates(value: IFilter) {
    return {
      ...value,
      scopeFrom: value.scopeFrom
        ? toCalendarDateWire(new Date(value.scopeFrom))
        : undefined,
      scopeUntil: value.scopeUntil
        ? toCalendarDateWire(new Date(value.scopeUntil))
        : undefined,
    };
  }

  private static mapDates(value: IClient) {
    return {
      ...value,
      birthdate: value.birthdate
        ? toCalendarDateWire(value.birthdate)
        : undefined,
      membership: value.membership
        ? {
            ...value.membership,
            validFrom: value.membership.validFrom
              ? toCalendarDateWire(value.membership.validFrom)
              : value.membership.validFrom,
            validUntil: value.membership.validUntil
              ? toCalendarDateWire(value.membership.validUntil)
              : undefined,
          }
        : value.membership,
      addresses: value.addresses.map((x) => ({
        ...x,
        validFrom: x.validFrom ? toCalendarDateWire(x.validFrom) : x.validFrom,
      })),
      clientContracts: value.clientContracts.map((x) => ({
        ...x,
        fromDate: x.fromDate
          ? toCalendarDateWire(x.fromDate)
          : x.fromDate,
        untilDate: x.untilDate
          ? toCalendarDateWire(x.untilDate)
          : x.untilDate,
      })),
      groupItems: value.groupItems.map((x) => ({
        ...x,
        validFrom: x.validFrom
          ? toCalendarDateWire(x.validFrom)
          : x.validFrom,
        validUntil: x.validUntil
          ? toCalendarDateWire(x.validUntil)
          : x.validUntil,
      })),
    };
  }

  private static correctGender(value: IClient): IClient {
    return {
      ...value,
      gender: Number(value.gender),
    };
  }

  private static stripAllIds(value: IClient): IClient {
    return {
      ...value,
      id: undefined,
      membership: value.membership
        ? { ...value.membership, id: undefined, clientId: undefined }
        : value.membership,
      addresses: value.addresses.map(({ id: _id, clientId: _clientId, ...rest }) => rest as IAddress),
      annotations: value.annotations.map(({ id: _id, clientId: _clientId, ...rest }) => rest as IAnnotation),
      communications: value.communications.map(({ id: _id, clientId: _clientId, ...rest }) => rest as ICommunication),
      clientContracts: value.clientContracts.map(({ id: _id, clientId: _clientId, ...rest }) => rest as IClientContract),
      groupItems: value.groupItems.map(({ clientId: _clientId, ...rest }) => rest as IClientGroupItem),
    };
  }

  private static removeEmptyIds(value: IClient): IClient {
    const cleanItem = <T extends { id?: string; clientId?: string }>(item: T): T => {
      if (item.id === '') {
        const { id: _id, clientId: _clientId, ...rest } = item;
        return rest as T;
      }
      return item;
    };

    return {
      ...value,
      addresses: value.addresses.map(cleanItem),
      communications: value.communications.map(cleanItem),
      annotations: value.annotations.map(cleanItem),
      clientContracts: value.clientContracts.map(cleanItem),
    };
  }

  private static removeEmptyCommunications(value: IClient): IClient {
    return {
      ...value,
      communications: value.communications.filter((x) => x.value !== ''),
    };
  }

  private static unformatPhoneNumbers(value: IClient): IClient {
    return {
      ...value,
      communications: value.communications.map((x) =>
        x.isPhone ? { ...x, value: unformatPhoneNumber(x.value) } : x,
      ),
    };
  }

  private static removeEmptyAnnotations(value: IClient): IClient {
    return {
      ...value,
      annotations: value.annotations.filter((x) => x.note !== ''),
    };
  }
}
