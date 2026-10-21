// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ICalendarSelection } from '../calendar/calendar-selection.interface';
import { IContract } from './contract.interface';
import { PaymentInterval } from './payment-interval.enum';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';

export class Contract implements IContract {
  id: string | undefined = '';
  name = '';
  guaranteedHours: number | undefined = undefined;
  maximumHours = 0;
  minimumHours = 0;
  fullTime = 0;
  nightRate: number | null = null;
  holidayRate: number | null = null;
  we1Rate: number | null = null;
  we2Rate: number | null = null;
  we3Rate: number | null = null;
  nightStart: string | null = null;
  nightEnd: string | null = null;
  paymentInterval = PaymentInterval.Monthly;
  percent: number | undefined = undefined;

  validFrom = companyToday();
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
  performsShiftWork: boolean | null = null;
}
