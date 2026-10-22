// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Route and query parameter that open the shift list with a view preselected. "view=orders" selects the
 * order intake: the original orders that are not sealed yet (ShiftFilterType.Original, isSealedOrder false).
 */
export const SHIFT_LIST_ROUTE = '/workplace/shift';

export const SHIFT_LIST_VIEW_QUERY_PARAM = 'view';

export const SHIFT_LIST_VIEW = {
  Orders: 'orders',
} as const;

export const SHIFT_LIST_ORDERS_VIEW_URL = `${SHIFT_LIST_ROUTE}?${SHIFT_LIST_VIEW_QUERY_PARAM}=${SHIFT_LIST_VIEW.Orders}`;
