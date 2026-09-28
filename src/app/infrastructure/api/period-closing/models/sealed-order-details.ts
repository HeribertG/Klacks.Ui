// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
