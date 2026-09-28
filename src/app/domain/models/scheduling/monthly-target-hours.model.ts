// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

export interface IMonthlyTargetHours {
  id?: string;
  year: number;
  month: number;
  hours: number;
}

export class MonthlyTargetHours implements IMonthlyTargetHours {
  id?: string = undefined;
  year = companyToday().getFullYear();
  month = 1;
  hours = 0;
}
