// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IHolidayWorkExemption {
  id: string;
  description: string;
  schedulingRuleId: string | null;
  importSourceKey: string;
}

export class HolidayWorkExemption implements IHolidayWorkExemption {
  id = '';
  description = '';
  schedulingRuleId: string | null = null;
  importSourceKey = '';
}
