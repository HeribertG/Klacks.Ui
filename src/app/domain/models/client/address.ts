// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { BaseEntity } from '../general-class';
import { IAddress } from './i-address';

export class Address extends BaseEntity implements IAddress {
  id = '';
  clientId = '';
  validFrom = new Date();
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
