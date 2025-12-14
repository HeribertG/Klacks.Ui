import { ShiftSporadic } from '../enums/shift-sporadic.enum';

export interface IShiftSchedule {
  shiftId: string;
  date: Date;
  dayOfWeek: number;
  shiftName: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  isSporadic: boolean;
  isTimeRange: boolean;
  shiftType: number;
  isInTemplateContainer: boolean;
  sumEmployees: number;
  quantity: number;
  sporadicScope: ShiftSporadic;
  engaged: number;
}

export class ShiftSchedule implements IShiftSchedule {
  shiftId = '';
  date: Date = new Date();
  dayOfWeek = 0;
  shiftName = '';
  abbreviation = '';
  startShift = '';
  endShift = '';
  workTime = 0;
  isSporadic = false;
  isTimeRange = false;
  shiftType = 0;
  isInTemplateContainer = false;
  sumEmployees = 0;
  quantity = 0;
  sporadicScope = ShiftSporadic.Week;
  engaged = 0;
}

export interface IShiftScheduleFilter {
  dayVisibleBeforeMonth: number;
  dayVisibleAfterMonth: number;
  currentMonth: number;
  currentYear: number;
  holidayDates?: Date[];
  selectedGroup?: string;
  searchString?: string;
  orderBy?: string;
  sortOrder?: string;
  container: boolean;
  isSporadic: boolean;
  isTimeRange: boolean;
  isStandartShift: boolean;
  startRow: number;
  rowCount: number;
}

export interface IShiftScheduleResponse {
  shifts: IShiftSchedule[];
  totalCount: number;
}

export class ShiftScheduleFilter implements IShiftScheduleFilter {
  dayVisibleBeforeMonth = 10;
  dayVisibleAfterMonth = 10;
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();
  holidayDates?: Date[];
  selectedGroup?: string;
  searchString?: string;
  orderBy?: string;
  sortOrder?: string;
  container = true;
  isSporadic = true;
  isTimeRange = true;
  isStandartShift = true;
  startRow = 0;
  rowCount = 100;
}
