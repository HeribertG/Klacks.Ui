import { IShift } from './shift-class';

export interface IContainerTemplateSlot {
  weekday: number;
  weekdayName: string;
  isHoliday: boolean;
  isWeekdayOrHoliday: boolean;
  dayIndex: number;
  label: string;
  fromTime: string;
  untilTime: string;
  availableTasks?: IShift[];
}

export interface IContainerTemplateGrid {
  containerShift: IShift;
  slots: IContainerTemplateSlot[][];
  crossesMidnight: boolean;
  totalRows: number;
  totalDays: number;
}
