// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { BaseEntity } from '../general-class';

export interface IAddress extends BaseEntity {
  id: string | undefined;
  clientId: string | undefined;
  validFrom: Date;
  type: number;
  addressLine1: string;
  addressLine2: string;
  street: string;
  street2: string;
  street3: string;
  zip: string;
  city: string;
  state: string;
  country: string;
  isScoped: boolean;
  isFuture: boolean;
  latitude?: number;
  longitude?: number;
}
