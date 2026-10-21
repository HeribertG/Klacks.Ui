// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IHolidayWorkExemption {
  id: string;
  description: string;
  schedulingRuleId: string | null;
  importSourceKey: string;
}
