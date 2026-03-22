// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Result of address validation via geocoding.
 * @param isValid - Whether the address could be successfully geocoded
 * @param suggestions - Alternative suggestions for invalid results
 */

export interface IAddressValidationResult {
  isValid: boolean;
  matchType: string;
  latitude?: number;
  longitude?: number;
  returnedAddress?: string;
  expectedState?: string;
  suggestions: IAddressSuggestion[];
}

export interface IAddressSuggestion {
  latitude: number;
  longitude: number;
  displayName: string;
}
