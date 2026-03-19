// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Ergebnis der Adress-Validierung via Geocoding.
 * @param isValid - Ob die Adresse erfolgreich geocodiert werden konnte
 * @param suggestions - Alternativ-Vorschlaege bei ungueltigem Ergebnis
 */

export interface IAddressValidationResult {
  isValid: boolean;
  matchType: string;
  latitude?: number;
  longitude?: number;
  returnedAddress?: string;
  suggestions: IAddressSuggestion[];
}

export interface IAddressSuggestion {
  latitude: number;
  longitude: number;
  displayName: string;
}
