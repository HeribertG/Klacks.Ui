// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filter state for the shared client-filter component.
 * @param showStandIns - Whether stand-ins are shown; undefined where the view never lists stand-ins, then no toggle is offered
 */
export interface IClientTypeFilter {
  orderBy: string;
  sortOrder: string;
  individualSort: boolean;
  showEmployees: boolean;
  showExtern: boolean;
  showStandIns?: boolean;
}
