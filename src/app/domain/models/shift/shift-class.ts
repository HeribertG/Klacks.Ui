// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Group } from '../group/group-class';
import { IClient } from '../client/client-class';
import { IShiftExpense } from './shift-expense.model';

export enum ShiftStatus {
  OriginalOrder = 0,
  SealedOrder = 1,
  OriginalShift = 2,
  SplitShift = 3,
}

export enum ShiftType {
  IsTask = 0,
  IsContainer = 1,
}

export enum ShiftSporadic {
  Week = 0,
  Month = 1,
  Quarter = 2,
  Semester = 3,
  Year = 4,
  ContractualTerm = 5,
}

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
  defaultExpenses: IShiftExpense[];
}

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
  client?: IClient | undefined = undefined;
  addressName: string | undefined = undefined;
  isNew?: boolean = false;
  defaultExpenses: IShiftExpense[] = [];
}
