// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AddressSearchHit } from './address-search-hit.interface';

export interface AddressSearchOutcome {
  hit: AddressSearchHit | null;
  failureMessageKey: string | null;
}
