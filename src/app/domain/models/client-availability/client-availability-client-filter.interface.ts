// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Filter für die Client-Availability Client-Liste.
 * @param searchString - Suchbegriff für Client-Name/Vorname/Firma
 * @param selectedGroup - Gruppen-Filter
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
