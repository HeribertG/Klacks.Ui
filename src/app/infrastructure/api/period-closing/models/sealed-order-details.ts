// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ISealedOrderWorkEntry } from './sealed-order-work-entry';

export interface ISealedOrderDetails {
  id: string;
  name: string;
  abbreviation: string;
  sourceSystemId: string | null;
  externalOrderReference: string | null;
  customerId: string | null;
  customerNumber: number | null;
  customerName: string | null;
  customerExternalReference: string | null;
  workEntries: ISealedOrderWorkEntry[];
}
