// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAddressInfo {
  city: string;
  country: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
}
