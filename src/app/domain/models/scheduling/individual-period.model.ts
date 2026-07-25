// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IPeriod {
  id?: string;
  fromDate: Date;
  untilDate: Date | undefined;
  fullHours: number;
}

export class Period implements IPeriod {
  id?: string = undefined;
  fromDate = new Date();
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
