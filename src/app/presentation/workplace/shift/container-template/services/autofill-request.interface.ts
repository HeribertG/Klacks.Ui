// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { Subject } from 'rxjs';

export interface AutofillRequest {
  containerShift: IShift | null;
  selectedWeekday: string | null;
  isHoliday: boolean;
  timeFrom: OwnTime;
  timeTo: OwnTime;
  additionalAvailableWorkIds: string[];
  timeRangeToleranceValue: number;
  destroy$: Subject<void>;
  onStateChanged?: () => void;
}
