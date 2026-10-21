// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * i18n keys of the onboarding tour inside the assistant chat: setup and intro offer, station chips,
 * hints Klacksy posts along the way and the labels of the onboarding progress card.
 */

const ONBOARDING_KEY = 'assistant-chat.onboarding.';
const INTRO_KEY = ONBOARDING_KEY + 'intro.';
const SETUP_CARD_KEY = ONBOARDING_KEY + 'card.';
const INTRO_CARD_KEY = INTRO_KEY + 'card.';

export const ONBOARDING_LLM_OFFLINE_KEY = ONBOARDING_KEY + 'llm.offline';
export const ONBOARDING_LLM_ONLINE_KEY = ONBOARDING_KEY + 'llm.online';
export const ONBOARDING_LLM_STILL_OFFLINE_KEY = ONBOARDING_KEY + 'llm.still-offline';
export const ONBOARDING_LLM_FREE_PROVIDERS_KEY = ONBOARDING_KEY + 'llm.free-providers';
export const ONBOARDING_DOUBLE_CLICK_EDIT_HINT_KEY = ONBOARDING_KEY + 'hint.double-click-edit';

export const ONBOARDING_OFFER_PROMPT_KEY = ONBOARDING_KEY + 'offer.prompt';
export const ONBOARDING_OFFER_ACCEPT_KEY = ONBOARDING_KEY + 'offer.accept';
export const ONBOARDING_OFFER_SNOOZE_KEY = ONBOARDING_KEY + 'offer.snooze';
export const ONBOARDING_OFFER_DISMISS_KEY = ONBOARDING_KEY + 'offer.dismiss';

export const ONBOARDING_TOUR_BACK_KEY = ONBOARDING_KEY + 'tour.back';
export const ONBOARDING_TOUR_DONE_KEY = ONBOARDING_KEY + 'tour.done';
export const ONBOARDING_TOUR_SKIP_KEY = ONBOARDING_KEY + 'tour.skip';
export const ONBOARDING_TOUR_END_KEY = ONBOARDING_KEY + 'tour.end';
export const ONBOARDING_TOUR_COMPLETED_KEY = ONBOARDING_KEY + 'tour.completed';

export const INTRO_OFFER_PROMPT_KEY = INTRO_KEY + 'offer.prompt';
export const INTRO_OFFER_LEGACY_PROMPT_KEY = INTRO_KEY + 'offer.legacy-prompt';
export const INTRO_OFFER_ACCEPT_KEY = INTRO_KEY + 'offer.accept';
export const INTRO_OFFER_SNOOZE_KEY = INTRO_KEY + 'offer.snooze';
export const INTRO_OFFER_DISMISS_KEY = INTRO_KEY + 'offer.dismiss';
export const INTRO_KNOWN_CHIP_KEY = INTRO_KEY + 'known.chip';
export const INTRO_KNOWN_CONFIRMED_KEY = INTRO_KEY + 'known.confirmed';
export const INTRO_TOUR_NEXT_KEY = INTRO_KEY + 'tour.next';
export const INTRO_TOUR_MORE_KEY = INTRO_KEY + 'tour.more';
export const INTRO_TOUR_COMPLETED_KEY = INTRO_KEY + 'tour.completed';

export const SETUP_CARD_KEYS = {
  title: SETUP_CARD_KEY + 'title',
  dismiss: SETUP_CARD_KEY + 'dismiss',
  start: SETUP_CARD_KEY + 'start',
  resume: SETUP_CARD_KEY + 'resume',
} as const;

export const INTRO_CARD_KEYS = {
  title: INTRO_CARD_KEY + 'title',
  dismiss: INTRO_CARD_KEY + 'dismiss',
  start: INTRO_CARD_KEY + 'start',
  resume: INTRO_CARD_KEY + 'resume',
} as const;

export const ONBOARDING_ASK_STATION_TYPE = 'ask';
