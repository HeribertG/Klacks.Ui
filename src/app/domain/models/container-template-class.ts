import { IShift } from './shift-class';

export interface IContainerTemplate {
  id?: string;
  containerId: string;
  fromTime: string;
  untilTime: string;
  weekday: number;
  isWeekdayOrHoliday: boolean;
  isHoliday: boolean;
  shift?: IShift;
  containerTemplateItems: IContainerTemplateItem[];
}

export interface IContainerTemplateItem {
  id?: string;
  containerTemplateId?: string;
  shiftId: string;
  startShift?: string;
  endShift?: string;
  briefingTime: string;
  debriefingTime: string;
  travelTimeAfter: string;
  travelTimeBefore: string;
  timeRangeStartShift: string;
  timeRangeEndShift: string;
  shift?: IShift;
}
