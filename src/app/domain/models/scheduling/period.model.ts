// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IPeriod } from './period.interface';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';

export class Period implements IPeriod {
  id?: string = undefined;
  fromDate = companyToday();
  untilDate: Date | undefined = undefined;
  fullHours = 0;
}
