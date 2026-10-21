// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TransportModeEnum } from '../../enums/transport-mode.enum';
import { IShift } from '../shift/shift.interface';
import { IAbsence } from '../absence/absence.interface';

export interface IContainerShiftOverrideItem {
  id?: string;
  containerShiftOverrideId?: string;
  shiftId?: string;
  absenceId?: string;
  startItem?: string;
  endItem?: string;
  briefingTime: string;
  debriefingTime: string;
  travelTimeAfter: string;
  travelTimeBefore: string;
  timeRangeStartItem: string | null;
  timeRangeEndItem: string | null;
  transportMode?: TransportModeEnum;
  shift?: IShift;
  absence?: IAbsence;
}
