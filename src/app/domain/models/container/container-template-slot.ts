// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShift } from '../shift/shift.interface';

export interface IContainerTemplateSlot {
  weekday: number;
  weekdayName: string;
  effectiveWeekday: number;
  isHoliday: boolean;
  isWeekdayAndHoliday: boolean;
  dayIndex: number;
  label: string;
  fromTime: string;
  untilTime: string;
  availableTasks?: IShift[];
  assignedTasks?: IShift[];
}
