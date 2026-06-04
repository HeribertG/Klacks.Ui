// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * String constants for the entityTypeFilter parameter used by the search_in_list Klacksy skill.
 * Maps to the boolean flags on the client Filter model (employee / externEmp / customer).
 */

export const EntityTypeFilter = {
  CUSTOMER: 'customer',
  EMPLOYEE: 'employee',
  EXTERN: 'extern',
} as const;

export type EntityTypeFilterValue = typeof EntityTypeFilter[keyof typeof EntityTypeFilter];
