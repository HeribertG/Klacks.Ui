// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ICalendarSelection } from '../calendar/calendar-selection-class';

export enum PaymentInterval {
  Weekly = 0,
  Biweekly = 1,
  Monthly = 2,
  Individual = 3,
}

export interface IContract {
  id: string | undefined;
  name: string;
  guaranteedHours: number;
  maximumHours: number;
  minimumHours: number;
  fullTime: number;
  nightRate: number;
  holidayRate: number;
  saRate: number;
  soRate: number;
  paymentInterval: PaymentInterval;
  validFrom: Date;
  validUntil: Date | undefined;
  calendarSelection: ICalendarSelection | undefined;
  calendarSelectionId: string | undefined;
  schedulingRuleId: string | undefined;
  workOnMonday: boolean;
  workOnTuesday: boolean;
  workOnWednesday: boolean;
  workOnThursday: boolean;
  workOnFriday: boolean;
  workOnSaturday: boolean;
  workOnSunday: boolean;
  performsShiftWork: boolean;
}

export class Contract implements IContract {
  id: string | undefined = '';
  name = '';
  guaranteedHours = 0;
  maximumHours = 0;
  minimumHours = 0;
  fullTime = 0;
  nightRate = 0;
  holidayRate = 0;
  saRate = 0;
  soRate = 0;
  paymentInterval = PaymentInterval.Monthly;

  validFrom = new Date();
  validUntil: Date | undefined = undefined;
  calendarSelection: ICalendarSelection | undefined = undefined;
  calendarSelectionId: string | undefined = undefined;
  schedulingRuleId: string | undefined = undefined;
  workOnMonday = true;
  workOnTuesday = true;
  workOnWednesday = true;
  workOnThursday = true;
  workOnFriday = true;
  workOnSaturday = false;
  workOnSunday = false;
  performsShiftWork = false;
}
