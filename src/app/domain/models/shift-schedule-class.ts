export interface IShiftSchedule {
  shiftId: string;
  date: Date;
  dayOfWeek: number;
  shiftName: string;
  isSporadic: boolean;
  isTimeRange: boolean;
  shiftType: number;
}

export class ShiftSchedule implements IShiftSchedule {
  shiftId = '';
  date: Date = new Date();
  dayOfWeek = 0;
  shiftName = '';
  isSporadic = false;
  isTimeRange = false;
  shiftType = 0;
}

export interface IShiftScheduleFilter {
  dayVisibleBeforeMonth: number;
  dayVisibleAfterMonth: number;
  currentMonth: number;
  currentYear: number;
  holidayDates?: Date[];
}

export class ShiftScheduleFilter implements IShiftScheduleFilter {
  dayVisibleBeforeMonth = 10;
  dayVisibleAfterMonth = 10;
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();
  holidayDates?: Date[];
}
