// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftStatus } from './shift-status.enum';
import { ShiftSporadic } from './shift-sporadic.enum';
import { ShiftType } from './shift-type.enum';
import { Group } from '../group/group-class';
import { IClient } from '../client/client-class';
import { IShiftExpense } from './shift-expense.interface';
import { IShiftRequiredQualification } from './shift-required-qualification.interface';

export interface IShift {
  cuttingAfterMidnight: boolean;
  abbreviation: string;
  description: string;
  id: string | undefined;
  macroId: string | undefined;
  name: string;
  parentId?: string;
  rootId?: string;
  lft: number | undefined;
  rgt: number | undefined;
  originalId?: string;
  status: ShiftStatus;
  afterShift: string;
  beforeShift: string;
  endShift: string;
  fromDate: Date | undefined;
  startShift: string;
  untilDate: Date | undefined;
  isFriday: boolean;
  isHoliday: boolean;
  isMonday: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  isThursday: boolean;
  isTuesday: boolean;
  isWednesday: boolean;
  isWeekdayAndHoliday: boolean;
  isSporadic: boolean;
  sporadicScope: ShiftSporadic;
  isTimeRange: boolean;
  quantity: number;
  sumEmployees: number;
  travelTimeAfter: string;
  travelTimeBefore: string;
  workTime: number;
  briefingTime: string;
  debriefingTime: string;
  shiftType: ShiftType;
  groups: Group[];
  clientId: string | undefined;
  client?: IClient | undefined;
  addressName: string | undefined;
  isNew?: boolean;
  isClientless?: boolean;
  defaultExpenses: IShiftExpense[];
  requiredQualifications: IShiftRequiredQualification[];
}
