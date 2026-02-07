import { IShift } from '../shift/shift-class';

export interface IContainerTemplateSlot {
  weekday: number;
  weekdayName: string;
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
