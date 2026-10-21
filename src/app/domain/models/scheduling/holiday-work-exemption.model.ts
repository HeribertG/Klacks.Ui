// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IHolidayWorkExemption } from './holiday-work-exemption.interface';

export class HolidayWorkExemption implements IHolidayWorkExemption {
  id = '';
  description = '';
  schedulingRuleId: string | null = null;
  importSourceKey = '';
}
