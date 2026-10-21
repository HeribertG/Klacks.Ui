// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftSporadic } from 'src/app/domain/enums/shift-sporadic.enum';
import { SporadicStatus } from 'src/app/domain/enums/sporadic-status.enum';

export interface DayInfo {
  isInTemplateContainer: boolean;
  hasOverride: boolean;
  hasWorkForOverride: boolean;
  overrideId?: string;
  sumEmployees: number;
  quantity: number;
  sporadicScope: ShiftSporadic;
  engaged: number;
  sporadicStatus: SporadicStatus;
  periodBookedDays: number;
}
