// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IMembership } from './i-membership';

export class Membership implements IMembership {
  id = '';
  clientId = '';
  client = undefined;
  validFrom = new Date();
  validUntil = undefined;

  type = 0;
}
