// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
