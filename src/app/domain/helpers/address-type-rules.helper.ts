// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure helpers that apply the address type rules of a client type.
 * @param entityType - Client type (EntityTypeEnum value); unknown values allow every address type
 * @param addressType - Address type (AddressTypeEnum value) to check
 * @param addresses - Addresses whose types are checked against the client type
 */
import {
  ALL_ADDRESS_TYPES,
  ALLOWED_ADDRESS_TYPES_BY_ENTITY_TYPE,
} from 'src/app/domain/constants/address-type-rules.constants';
import { AddressTypeEnum, EntityTypeEnum } from 'src/app/domain/enums/client-enum';

export function getAllowedAddressTypes(entityType: number): AddressTypeEnum[] {
  const allowed = ALLOWED_ADDRESS_TYPES_BY_ENTITY_TYPE[entityType as EntityTypeEnum] ?? ALL_ADDRESS_TYPES;
  return [...allowed];
}

export function isAddressTypeAllowed(entityType: number, addressType: number): boolean {
  return getAllowedAddressTypes(entityType).includes(addressType);
}

export function findDisallowedAddressTypes(
  entityType: number,
  addresses: readonly { type: number }[],
): AddressTypeEnum[] {
  const disallowed = new Set<AddressTypeEnum>();
  for (const address of addresses) {
    if (!isAddressTypeAllowed(entityType, address.type)) {
      disallowed.add(address.type);
    }
  }
  return [...disallowed].sort((a, b) => a - b);
}
