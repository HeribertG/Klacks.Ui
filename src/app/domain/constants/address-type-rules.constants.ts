// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Rule table defining which address types a client may have, depending on the client type.
 * @param ALLOWED_ADDRESS_TYPES_BY_ENTITY_TYPE - Allowed address types per client type (employee, external employee, customer)
 * @param ALL_ADDRESS_TYPES - Every address type, used when the client type is unknown
 */
import { AddressTypeEnum, EntityTypeEnum } from 'src/app/domain/enums/client-enum';

export const ALL_ADDRESS_TYPES: readonly AddressTypeEnum[] = [
  AddressTypeEnum.customer,
  AddressTypeEnum.workplace,
  AddressTypeEnum.invoicingAddress,
];

export const ALLOWED_ADDRESS_TYPES_BY_ENTITY_TYPE: Readonly<Record<EntityTypeEnum, readonly AddressTypeEnum[]>> = {
  [EntityTypeEnum.employee]: [AddressTypeEnum.customer],
  [EntityTypeEnum.externEmp]: [AddressTypeEnum.customer, AddressTypeEnum.workplace],
  [EntityTypeEnum.customer]: [
    AddressTypeEnum.customer,
    AddressTypeEnum.workplace,
    AddressTypeEnum.invoicingAddress,
  ],
};
