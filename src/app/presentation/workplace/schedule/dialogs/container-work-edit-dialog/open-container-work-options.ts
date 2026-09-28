// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
