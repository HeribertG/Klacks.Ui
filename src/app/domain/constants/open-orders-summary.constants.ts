// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * I18n keys, content parameters and button texts of the daily open-orders summary in the Klacksy inbox.
 * The server sends only the general key with the parameters count and soonCount; the client picks the
 * sentence variant for one order and for none or one starting soon, because the translation runtime has
 * no plural support and a general sentence cannot read correctly for every number.
 */
export const OPEN_ORDERS_SUMMARY_I18N = {
  General: 'assistant.proactive.openOrdersSummary',
  ManyNoneSoon: 'assistant.proactive.openOrdersSummary.countOther.soonNone',
  ManyOneSoon: 'assistant.proactive.openOrdersSummary.countOther.soonOne',
  OneNoneSoon: 'assistant.proactive.openOrdersSummary.countOne.soonNone',
  OneSoon: 'assistant.proactive.openOrdersSummary.countOne.soonOne',
} as const;

export const OPEN_ORDERS_SUMMARY_PARAM = {
  Count: 'count',
  SoonCount: 'soonCount',
} as const;

export const OPEN_ORDERS_SEAL_LABEL_KEY = 'klacksy.focus.no-shifts.action';

export const OPEN_ORDERS_SEAL_REQUEST_KEY = 'klacksy.setup.seal-open-orders.request';

export const OPEN_ORDERS_VIEW_LIST_LABEL_KEY = 'assistant-chat.proactive.open-orders.view-list';

export const OPEN_ORDERS_SNOOZED_KEY = 'assistant-chat.proactive.open-orders.snoozed';
