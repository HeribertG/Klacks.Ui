// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Model and enum for client shift preferences (preferred, blacklist).
 * @param preferenceType - Category of the preference (0=Preferred, 1=Blacklist)
 */

export enum ShiftPreferenceType {
  Preferred = 0,
  Blacklist = 1,
}

export interface IAvailableShift {
  id: string;
  name: string;
  abbreviation?: string;
}

export interface IClientShiftPreference {
  id: string;
  clientId: string;
  shiftId: string;
  preferenceType: ShiftPreferenceType;
  shiftName?: string;
  shiftAbbreviation?: string;
}
