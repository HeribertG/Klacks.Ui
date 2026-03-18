// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IBaseFilter } from '../general-class';
import { ICountry } from './i-country';
import { StateCountryToken } from '../calendar/calendar-rule-class';

export interface IFilter extends IBaseFilter {
  scopeFromFlag: boolean | undefined;
  scopeUntilFlag: boolean | undefined;
  scopeFrom: Date | undefined;
  scopeUntil: Date | undefined;
  showDeleteEntries: boolean | undefined;

  macroFilter: string | undefined;
  clientType: number | undefined;

  searchOnlyByName: boolean | undefined;

  male: boolean | undefined;
  female: boolean | undefined;
  legalEntity: boolean | undefined;
  intersexuality: boolean | undefined;

  companyAddress: boolean | undefined;
  invoiceAddress: boolean | undefined;
  homeAddress: boolean | undefined;

  countriesHaveBeenReadIn: boolean;
  countries: ICountry[];

  activeMembership: boolean | undefined;
  formerMembership: boolean | undefined;
  futureMembership: boolean | undefined;

  hasAnnotation: boolean | undefined;

  list: StateCountryToken[];
  filteredStateToken: StateCountryToken[];

  selectedGroup: string | undefined;

  employee: boolean;
  externEmp: boolean;
  customer: boolean;
}
