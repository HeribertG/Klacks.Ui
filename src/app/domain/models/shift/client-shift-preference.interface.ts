// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftPreferenceType } from './shift-preference-type.enum';

export interface IClientShiftPreference {
  id: string;
  clientId: string;
  shiftId: string;
  preferenceType: ShiftPreferenceType;
  shiftName?: string;
  shiftAbbreviation?: string;
}
