// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PaymentInterval } from './payment-interval.enum';
import { ICalendarSelection } from '../calendar/calendar-selection.interface';

export interface IContract {
  id: string | undefined;
  name: string;
  guaranteedHours: number | undefined;
  maximumHours: number;
  minimumHours: number;
  fullTime: number;
  nightRate: number | null;
  holidayRate: number | null;
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
  performsShiftWork: boolean | null;
}
