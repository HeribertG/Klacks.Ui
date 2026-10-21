// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShiftDatePair } from './shift-date-pair.interface';

export interface IShiftSchedulePartialFilter {
  shiftDatePairs: IShiftDatePair[];
  analyseToken?: string;
}
