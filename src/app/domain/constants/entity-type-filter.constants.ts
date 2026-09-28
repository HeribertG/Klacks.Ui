// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
