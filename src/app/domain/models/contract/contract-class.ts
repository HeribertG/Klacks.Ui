// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ICalendarSelection } from '../calendar/calendar-selection-class';

export enum PaymentInterval {
  Weekly = 0,
  Biweekly = 1,
  Monthly = 2,
  Individual = 3,
  MonthlyTargetHours = 4,
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
  we1Rate: number | null;
  we2Rate: number | null;
  we3Rate: number | null;
  nightStart: string | null;
  nightEnd: string | null;
  paymentInterval: PaymentInterval;
  percent: number | undefined;
  validFrom: Date;
  validUntil: Date | undefined;
  calendarSelection: ICalendarSelection | undefined;
  calendarSelectionId: string | undefined;
  schedulingRuleId: string | undefined;
  individualPeriodId: string | undefined;
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
  we1Rate: number | null = null;
  we2Rate: number | null = null;
  we3Rate: number | null = null;
  nightStart: string | null = null;
  nightEnd: string | null = null;
  paymentInterval = PaymentInterval.Monthly;
  percent: number | undefined = undefined;

  validFrom = new Date();
  validUntil: Date | undefined = undefined;
  calendarSelection: ICalendarSelection | undefined = undefined;
  calendarSelectionId: string | undefined = undefined;
  schedulingRuleId: string | undefined = undefined;
  individualPeriodId: string | undefined = undefined;
  workOnMonday = true;
  workOnTuesday = true;
  workOnWednesday = true;
  workOnThursday = true;
  workOnFriday = true;
  workOnSaturday = false;
  workOnSunday = false;
  performsShiftWork = false;
}
