// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Picks the sentence variant of the daily open-orders summary for the numbers the server sent: one order
 * or several, and none, one or several of them starting within the next seven days. Anything the server
 * did not send as a whole number falls back to the general key, which reads correctly for any number.
 * @param params - Content parameters of the inbox row; count and soonCount as decimal strings
 */
import { OPEN_ORDERS_SUMMARY_I18N, OPEN_ORDERS_SUMMARY_PARAM } from 'src/app/domain/constants/open-orders-summary.constants';

const WHOLE_NUMBER_PATTERN = /^\d+$/;
const NONE = 0;
const SINGLE = 1;

export function openOrdersSummaryKey(params: Record<string, string> | undefined): string {
  const count = parseWholeNumber(params?.[OPEN_ORDERS_SUMMARY_PARAM.Count]);
  const soonCount = parseWholeNumber(params?.[OPEN_ORDERS_SUMMARY_PARAM.SoonCount]);
  if (count === null || soonCount === null || soonCount > count) {
    return OPEN_ORDERS_SUMMARY_I18N.General;
  }
  if (count === SINGLE) {
    return soonCount === NONE ? OPEN_ORDERS_SUMMARY_I18N.OneNoneSoon : OPEN_ORDERS_SUMMARY_I18N.OneSoon;
  }
  if (soonCount === NONE) {
    return OPEN_ORDERS_SUMMARY_I18N.ManyNoneSoon;
  }
  return soonCount === SINGLE ? OPEN_ORDERS_SUMMARY_I18N.ManyOneSoon : OPEN_ORDERS_SUMMARY_I18N.General;
}

function parseWholeNumber(value: string | undefined): number | null {
  return value !== undefined && WHOLE_NUMBER_PATTERN.test(value) ? Number(value) : null;
}
