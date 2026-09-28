// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
