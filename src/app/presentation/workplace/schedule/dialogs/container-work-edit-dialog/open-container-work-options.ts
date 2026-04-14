// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { AvailableShift } from 'src/app/domain/models/schedule/available-shift';

export interface IOpenContainerWorkOptions {
  workId: string;
  shiftId: string;
  currentDate: Date;
  availableShifts: AvailableShift[];
  containerStartTime?: string;
  containerEndTime?: string;
  isHoliday?: boolean;
}
