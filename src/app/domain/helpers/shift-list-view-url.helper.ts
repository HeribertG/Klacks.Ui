// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the URL that opens the shift list on the plannable shifts, optionally narrowed to a validity window.
 * @param from - First day of the window as "yyyy-MM-dd", omitted from the URL when empty
 * @param until - Last day of the window as "yyyy-MM-dd", omitted from the URL when empty
 */

import {
  SHIFT_LIST_FROM_QUERY_PARAM,
  SHIFT_LIST_ROUTE,
  SHIFT_LIST_UNTIL_QUERY_PARAM,
  SHIFT_LIST_VIEW,
  SHIFT_LIST_VIEW_QUERY_PARAM,
} from '../constants/shift-list-view.constants';

export function buildShiftListPlannableViewUrl(from?: string, until?: string): string {
  const params = new URLSearchParams({ [SHIFT_LIST_VIEW_QUERY_PARAM]: SHIFT_LIST_VIEW.Plannable });
  if (from) {
    params.set(SHIFT_LIST_FROM_QUERY_PARAM, from);
  }
  if (until) {
    params.set(SHIFT_LIST_UNTIL_QUERY_PARAM, until);
  }
  return `${SHIFT_LIST_ROUTE}?${params.toString()}`;
}
