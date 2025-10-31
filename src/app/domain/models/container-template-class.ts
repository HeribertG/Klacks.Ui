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
  items: IContainerTemplateItem[];
}

export interface IContainerTemplateItem {
  id?: string;
  containerTemplateId?: string;
  shiftId: string;
  shift?: IShift;
}
