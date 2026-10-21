// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface AddressValidationFailedEvent {
  street: string;
  zip: string;
  city: string;
  country: string;
  state: string;
  suggestions: { displayName: string; latitude: number; longitude: number }[];
}
