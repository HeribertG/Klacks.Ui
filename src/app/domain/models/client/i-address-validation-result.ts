// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Result of address validation via geocoding.
 * @param isValid - Whether the address could be successfully geocoded
 * @param suggestions - Alternative suggestions for invalid results
 */

import { IAddressSuggestion } from './address-suggestion.interface';

export interface IAddressValidationResult {
  isValid: boolean;
  matchType: string;
  latitude?: number;
  longitude?: number;
  returnedAddress?: string;
  expectedState?: string;
  suggestions: IAddressSuggestion[];
}
