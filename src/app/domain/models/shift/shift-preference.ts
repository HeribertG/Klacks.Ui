// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Model and enum for client shift preferences (whitelist, preferred, blacklist).
 * @param preferenceType - Category of the preference (0=Whitelist, 1=Preferred, 2=Blacklist)
 */

export enum ShiftPreferenceType {
  Whitelist = 0,
  Preferred = 1,
  Blacklist = 2,
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
