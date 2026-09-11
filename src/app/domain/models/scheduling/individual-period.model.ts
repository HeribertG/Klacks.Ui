// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

export interface IPeriod {
  id?: string;
  fromDate: Date;
  untilDate: Date | undefined;
  fullHours: number;
}

export class Period implements IPeriod {
  id?: string = undefined;
  fromDate = companyToday();
  untilDate: Date | undefined = undefined;
  fullHours = 0;
}

export interface IIndividualPeriod {
  id?: string;
  name: string;
  periods: IPeriod[];
}

export class IndividualPeriod implements IIndividualPeriod {
  id?: string = undefined;
  name = '';
  periods: IPeriod[] = [];
}
