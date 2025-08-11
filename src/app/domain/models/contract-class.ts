import { ICalendarSelection } from './calendar-selection-class';

export interface IContract {
  id: string | undefined;
  name: string;
  guaranteedHoursPerMonth: number;
  maximumHoursPerMonth: number;
  minimumHoursPerMonth: number;
  validFrom: Date;
  validUntil: Date | undefined;
  calendarSelection: ICalendarSelection | undefined;
  internal: boolean | undefined;
}

export class Contract implements IContract {
  id: string | undefined = '';
  name = '';
  guaranteedHoursPerMonth = 0;
  maximumHoursPerMonth = 0;
  minimumHoursPerMonth = 0;
  validFrom = new Date();
  validUntil: Date | undefined = undefined;
  calendarSelection: ICalendarSelection | undefined = undefined;
  internal: boolean | undefined = undefined;
}