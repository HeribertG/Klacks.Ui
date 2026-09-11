// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { BaseEntity } from '../general-class';
import { IAddress } from './i-address';
import { companyToday } from 'src/app/shared/helpers/calendar-date.helper';

export class Address extends BaseEntity implements IAddress {
  id = '';
  clientId = '';
  validFrom = companyToday();
  type = 0;
  addressLine1 = '';
  addressLine2 = '';
  street = '';
  street2 = '';
  street3 = '';
  zip = '';
  city = '';
  state = '';
  country = '';
  isScoped = true;
  isFuture = false;
}
