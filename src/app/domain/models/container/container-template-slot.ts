// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShift } from '../shift/shift-class';

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

export interface IContainerTemplateGrid {
  containerShift: IShift;
  slots: IContainerTemplateSlot[][];
  crossesMidnight: boolean;
  totalRows: number;
  totalDays: number;
}
