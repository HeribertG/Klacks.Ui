// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IMonthlyTargetHours {
  id?: string;
  year: number;
  month: number;
  hours: number;
}

export class MonthlyTargetHours implements IMonthlyTargetHours {
  id?: string = undefined;
  year = new Date().getFullYear();
  month = 1;
  hours = 0;
}
