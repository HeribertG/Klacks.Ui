import { Rectangle } from '../shared/grid/classes/geometry';
import {
  BaseFilter,
  BaseTruncated,
  IBaseFilter,
  IBaseTruncated,
} from './general-class';
import { MultiLanguage } from './multi-language-class';

export interface IAbsenceFilter extends IBaseFilter {
  language: string | undefined;
}

export class AbsenceFilter extends BaseFilter implements IAbsenceFilter {
  language = 'en';
}

export interface ITruncatedAbsence extends IBaseTruncated {
  absences: Absence[];
}

export class TruncatedAbsence
  extends BaseTruncated
  implements ITruncatedAbsence
{
  absences: Absence[] = [];
}

export interface IAbsence {
  id: string | undefined;
  name?: MultiLanguage | undefined;
  description?: MultiLanguage | undefined;
  color: string | undefined;
  defaultLength: number;
  defaultValue: number;
  hideInGantt: boolean;
  undeletable: boolean;
  withSaturday: boolean;
  withSunday: boolean;
  withHoliday: boolean;
}

export class Absence implements IAbsence {
  id = undefined;
  name?: MultiLanguage | undefined = undefined;
  description?: MultiLanguage | undefined = undefined;
  color = '';
  defaultLength = 0;
  defaultValue = 1;
  hideInGantt = false;
  undeletable = false;
  withSaturday = false;
  withSunday = false;
  withHoliday = false;
}

export interface IAbsenceReason {
  id: string | undefined;
  name: string;
  description: string;
  backgroundColor: string;
  defaultLength: number;
  defaultValue: number;
  withSaturday: boolean;
  withSunday: boolean;
  withHoliday: boolean;
  isWork: boolean;
}

export class AbsenceReason implements IAbsenceReason {
  id = undefined;
  name = '';
  description = '';
  backgroundColor = '';
  defaultLength = 0;
  defaultValue = 0;
  withSaturday = false;
  withSunday = false;
  withHoliday = false;
  isWork = false;
}

export class CalendarHeaderDayRank {
  backColor = '';
  name = '';
  rect: Rectangle = new Rectangle(0, 0, 20, 20);
}
