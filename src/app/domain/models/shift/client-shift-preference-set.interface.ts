// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAvailableShift } from './shift-preference';
import { IClientShiftPreference } from './client-shift-preference.interface';

export interface IClientShiftPreferenceSet {
  availableShifts: IAvailableShift[];
  preferred: IClientShiftPreference[];
  blacklist: IClientShiftPreference[];
}
