// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IPeriod } from './period.interface';
import { IIndividualPeriod } from './individual-period.interface';
import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

export class Period implements IPeriod {
  id?: string = undefined;
  fromDate = companyToday();
  untilDate: Date | undefined = undefined;
  fullHours = 0;
}

export class IndividualPeriod implements IIndividualPeriod {
  id?: string = undefined;
  name = '';
  periods: IPeriod[] = [];
}
