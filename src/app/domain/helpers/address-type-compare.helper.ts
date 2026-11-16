// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Comparator ordering addresses by ascending address type; equal types compare as 0 so a stable sort keeps their order.
 * @param a - First address
 * @param b - Second address
 */

import { IAddress } from 'src/app/domain/models/client/i-address';

export function compareAddressesByType(a: IAddress, b: IAddress): number {
  const first = a.type as number;
  const second = b.type as number;

  return first < second ? -1 : first > second ? 1 : 0;
}
