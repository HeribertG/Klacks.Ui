// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Filter for the client availability client list.
 * @param searchString - Search term for client name/first name/company
 * @param selectedGroup - Group filter
 */
export interface IClientAvailabilityClientFilter {
  searchString: string;
  startDate: string;
  endDate: string;
  selectedGroup?: string;
  orderBy: string;
  sortOrder: string;
  showEmployees: boolean;
  showExtern: boolean;
  startRow: number;
  rowCount: number;
}
