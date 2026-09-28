// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filter state for the shared client-filter component.
 */
export interface IClientTypeFilter {
  orderBy: string;
  sortOrder: string;
  individualSort: boolean;
  showEmployees: boolean;
  showExtern: boolean;
}
