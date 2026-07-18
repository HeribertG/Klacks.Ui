// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IRestrictedTimeWindowRule {
  id: string;
  seasonFromMonth: number;
  seasonFromDay: number;
  seasonToMonth: number;
  seasonToDay: number;
  dailyStart: string;
  dailyEnd: string;
  appliesToGroupTag: string;
}

export class RestrictedTimeWindowRule implements IRestrictedTimeWindowRule {
  id = '';
  seasonFromMonth = 1;
  seasonFromDay = 1;
  seasonToMonth = 12;
  seasonToDay = 31;
  dailyStart = '22:00';
  dailyEnd = '06:00';
  appliesToGroupTag = '';
}
