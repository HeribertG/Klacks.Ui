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
import { dateWithLocalTimeCorrection } from 'src/app/shared/helpers/date.helper';

export class ClientDataMapper {
  static mapForUpdate(value: IClient): IClient {
    let mapped = ClientDataMapper.mapDates(value);
    mapped = ClientDataMapper.removeEmptyIds(mapped);
    mapped = ClientDataMapper.removeEmptyCommunications(mapped);
    mapped = ClientDataMapper.unformatPhoneNumbers(mapped);
    mapped = ClientDataMapper.removeEmptyAnnotations(mapped);
    return mapped;
  }

  static mapForCreate(value: IClient): IClient {
    let mapped = ClientDataMapper.correctGender(value);
    mapped = ClientDataMapper.mapDates(mapped);
    mapped = ClientDataMapper.stripAllIds(mapped);
    mapped = ClientDataMapper.removeEmptyCommunications(mapped);
    mapped = ClientDataMapper.unformatPhoneNumbers(mapped);
    mapped = ClientDataMapper.removeEmptyAnnotations(mapped);
    return mapped;
  }

  static mapFilterDates(value: IFilter): IFilter {
    return {
      ...value,
      scopeFrom: value.scopeFrom
        ? dateWithLocalTimeCorrection(new Date(value.scopeFrom))
        : undefined,
      scopeUntil: value.scopeUntil
        ? dateWithLocalTimeCorrection(new Date(value.scopeUntil))
        : undefined,
    };
  }

  private static mapDates(value: IClient): IClient {
    return {
      ...value,
      birthdate: value.birthdate
        ? dateWithLocalTimeCorrection(new Date(value.birthdate))
        : undefined,
      membership: value.membership
        ? {
            ...value.membership,
            validFrom: value.membership.validFrom
              ? dateWithLocalTimeCorrection(new Date(value.membership.validFrom))!
              : value.membership.validFrom,
            validUntil: value.membership.validUntil
              ? dateWithLocalTimeCorrection(new Date(value.membership.validUntil))!
              : undefined,
          }
        : value.membership,
      addresses: value.addresses.map((x) => ({
        ...x,
        validFrom: dateWithLocalTimeCorrection(x.validFrom)!,
      })),
      clientContracts: value.clientContracts.map((x) => ({
        ...x,
        fromDate: x.fromDate
          ? dateWithLocalTimeCorrection(new Date(x.fromDate))!
          : x.fromDate,
        untilDate: x.untilDate
          ? dateWithLocalTimeCorrection(new Date(x.untilDate))!
          : x.untilDate,
      })),
      groupItems: value.groupItems.map((x) => ({
        ...x,
        validFrom: x.validFrom
          ? dateWithLocalTimeCorrection(new Date(x.validFrom))!
          : x.validFrom,
        validUntil: x.validUntil
          ? dateWithLocalTimeCorrection(new Date(x.validUntil))!
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
      addresses: value.addresses.map(({ id, clientId, ...rest }) => rest as IAddress),
      annotations: value.annotations.map(({ id, clientId, ...rest }) => rest as IAnnotation),
      communications: value.communications.map(({ id, clientId, ...rest }) => rest as ICommunication),
      clientContracts: value.clientContracts.map(({ id, clientId, ...rest }) => rest as IClientContract),
      groupItems: value.groupItems.map(({ clientId, ...rest }) => rest as IClientGroupItem),
    };
  }

  private static removeEmptyIds(value: IClient): IClient {
    const cleanItem = <T extends { id?: string; clientId?: string }>(item: T): T => {
      if (item.id === '') {
        const { id, clientId, ...rest } = item;
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
