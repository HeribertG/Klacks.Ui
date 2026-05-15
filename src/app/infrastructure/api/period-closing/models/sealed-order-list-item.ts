// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface SealedOrderListItem {
  id: string;
  abbreviation: string;
  name: string;
  fromDate: string;
  untilDate: string | null;
  customerId: string | null;
  customerNumber: number | null;
  customerName: string | null;
  totalWorks: number;
  closedWorks: number;
}
