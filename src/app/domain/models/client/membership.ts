// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IMembership } from './i-membership';
import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

export class Membership implements IMembership {
  id = '';
  clientId = '';
  client = undefined;
  validFrom = companyToday();
  validUntil = undefined;

  type = 0;
}
