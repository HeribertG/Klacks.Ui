// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the UI explain offers (T5): the topic keys and outcomes the backend endpoint
 * `assistant/explain-offers` knows, the backend path (the HTTP interceptor treats its failures as a quiet
 * background read - no toast, no error page, no reset of an unsaved form), and the i18n keys of the FT/+FT offer.
 * WorkBookingRefusal is passive: the "Why? Ask Klacksy" link of a refused booking only records its click (accepted),
 * it never asks whether it may be shown.
 */

export const EXPLAIN_OFFERS_PATH = 'assistant/explain-offers';

export const EXPLAIN_OFFER_TOPIC = {
  ShiftHolidayOptions: 'shift-holiday-options',
  WorkBookingRefusal: 'work-booking-refusal',
} as const;

export type ExplainOfferTopic = (typeof EXPLAIN_OFFER_TOPIC)[keyof typeof EXPLAIN_OFFER_TOPIC];

export const EXPLAIN_OFFER_OUTCOME = {
  Shown: 'shown',
  Accepted: 'accepted',
  Later: 'later',
  Declined: 'declined',
} as const;

export type ExplainOfferOutcome = (typeof EXPLAIN_OFFER_OUTCOME)[keyof typeof EXPLAIN_OFFER_OUTCOME];

export const HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS = {
  prompt: 'shift.holidayOptions.explainOffer.prompt',
  accept: 'shift.holidayOptions.explainOffer.accept',
  later: 'shift.holidayOptions.explainOffer.later',
  decline: 'shift.holidayOptions.explainOffer.decline',
  triggerPhrase: 'shift.holidayOptions.explainOffer.triggerPhrase',
} as const;
