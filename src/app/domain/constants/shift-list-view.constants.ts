// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Route and query parameters that open the shift list with a view preselected. "view=orders" selects the
 * order intake: the original orders that are not sealed yet (ShiftFilterType.Original, isSealedOrder false).
 * "view=plannable" selects the plannable shifts (ShiftFilterType.Shift), optionally narrowed to the validity window
 * "from" .. "until" (calendar dates "yyyy-MM-dd", either one may be left out). With a window the newest shifts come
 * first (SHIFT_LIST_PLANNABLE_WINDOW_SORT), so shifts that were just cut from orders are not buried under the
 * long-running shifts that also overlap the window. Klacks.Api builds these URLs from ShiftListViewRoutes;
 * Klacks.UnitTest ShiftListViewRoutesUiMirrorGuardTests keeps both sides equal.
 */
export const SHIFT_LIST_ROUTE = '/workplace/shift';

export const SHIFT_LIST_VIEW_QUERY_PARAM = 'view';

export const SHIFT_LIST_FROM_QUERY_PARAM = 'from';

export const SHIFT_LIST_UNTIL_QUERY_PARAM = 'until';

export const SHIFT_LIST_VIEW = {
  Orders: 'orders',
  Plannable: 'plannable',
} as const;

export const SHIFT_LIST_VALID_FROM_SORT_KEY = 'valid_from';

export const SHIFT_LIST_PLANNABLE_WINDOW_SORT = {
  orderBy: SHIFT_LIST_VALID_FROM_SORT_KEY,
  sortOrder: 'desc',
} as const;

export const SHIFT_LIST_ORDERS_VIEW_URL = `${SHIFT_LIST_ROUTE}?${SHIFT_LIST_VIEW_QUERY_PARAM}=${SHIFT_LIST_VIEW.Orders}`;
