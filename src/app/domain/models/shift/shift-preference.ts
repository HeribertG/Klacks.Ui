// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Model and enum for client shift preferences (preferred, blacklist).
 * @param preferenceType - Category of the preference (0=Preferred, 1=Blacklist)
 */

export interface IAvailableShift {
  id: string;
  name: string;
  abbreviation?: string;
}
