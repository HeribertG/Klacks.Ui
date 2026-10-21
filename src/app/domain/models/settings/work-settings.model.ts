// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IWorkSettings } from './work-settings.interface';

export class WorkSettings implements IWorkSettings {
  vacationDaysPerYear = 25;
  probationPeriod = 3;
  noticePeriod = 30;
  paymentInterval = 2;
  nightRate = 0;
  holidayRate = 0;
  saRate = 0;
  soRate = 0;
  dayVisibleBefore = 3;
  dayVisibleAfter = 3;
}
