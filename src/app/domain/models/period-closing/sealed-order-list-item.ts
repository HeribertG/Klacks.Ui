// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface SealedOrderListItem {
  id: string;
  abbreviation: string;
  name: string;
  fromDate: string;
  untilDate: string | null;
  sourceSystemId: string | null;
  externalOrderReference: string | null;
  customerId: string | null;
  customerNumber: number | null;
  customerName: string | null;
  totalWorks: number;
  closedWorks: number;
}
