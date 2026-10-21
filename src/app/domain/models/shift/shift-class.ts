// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Group } from '../group/group-class';
import { IClient } from '../client/client-class';
import { IShiftExpense } from './shift-expense.interface';
import { IShift } from './shift.interface';
import { ShiftStatus } from './shift-status.enum';
import { ShiftType } from './shift-type.enum';
import { ShiftSporadic } from './shift-sporadic.enum';
import { IShiftRequiredQualification } from './shift-required-qualification.interface';

export class Shift implements IShift {
  cuttingAfterMidnight = false;
  abbreviation = '';
  description = '';
  id: string | undefined = undefined;
  macroId: string | undefined = undefined;
  name = '';
  parentId?: string;
  rootId?: string;
  lft: number | undefined = undefined;
  rgt: number | undefined = undefined;
  originalId?: string;
  status: ShiftStatus = ShiftStatus.OriginalOrder;
  afterShift = '';
  beforeShift = '';
  endShift = '';
  briefingTime = '';
  fromDate: Date | undefined = undefined;
  startShift = '';
  debriefingTime = '';
  untilDate: Date | undefined = undefined;
  isFriday = false;
  isHoliday = false;
  isMonday = false;
  isSaturday = false;
  isSunday = false;
  isThursday = false;
  isTuesday = false;
  isWednesday = false;
  isWeekdayAndHoliday = false;
  isSporadic = false;
  sporadicScope: ShiftSporadic = ShiftSporadic.Week;
  isTimeRange = false;
  quantity = 1;
  sumEmployees = 1;
  travelTimeAfter = '';
  travelTimeBefore = '';
  workTime = 0;
  shiftType: ShiftType = ShiftType.IsTask;
  groups: Group[] = [];
  clientId: string | undefined = undefined;
  isClientless?: boolean = false;
  client?: IClient | undefined = undefined;
  addressName: string | undefined = undefined;
  isNew?: boolean = false;
  defaultExpenses: IShiftExpense[] = [];
  requiredQualifications: IShiftRequiredQualification[] = [];
}
