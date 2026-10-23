// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards the texts of the daily open-orders summary in the four core languages: every sentence variant the
 * client picks, the two new button and toast texts, the reused seal and later texts, and the placeholders each
 * variant must carry. The 21 language packs live in Klacks.Api and are checked there.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  OPEN_ORDERS_SEAL_LABEL_KEY,
  OPEN_ORDERS_SEAL_REQUEST_KEY,
  OPEN_ORDERS_SNOOZED_KEY,
  OPEN_ORDERS_SUMMARY_I18N,
  OPEN_ORDERS_VIEW_LIST_LABEL_KEY,
} from 'src/app/domain/constants/open-orders-summary.constants';
import { WELCOME_FOCUS_LATER_LABEL_KEY } from 'src/app/domain/constants/welcome-focus.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const I18N_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../assets/i18n');
const COUNT = '{{count}}';
const SOON_COUNT = '{{soonCount}}';
const OLD_PER_ORDER_KEY = 'assistant.proactive.openOrder';
const GOAL_RATIONALE_KEY = 'assistant-chat.goal-candidates.type.openOrder.rationale';
const REVIEW_REQUEST_KEY = 'klacksy.orders.review.request';
const RETIRED_SEAL_REQUEST_KEY = 'klacksy.setup.seal-open-orders.request';

const load = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'));

const REQUIRED_KEYS = [
  ...Object.values(OPEN_ORDERS_SUMMARY_I18N),
  OPEN_ORDERS_VIEW_LIST_LABEL_KEY,
  OPEN_ORDERS_SNOOZED_KEY,
  OPEN_ORDERS_SEAL_LABEL_KEY,
  OPEN_ORDERS_SEAL_REQUEST_KEY,
  WELCOME_FOCUS_LATER_LABEL_KEY,
  OLD_PER_ORDER_KEY,
];

describe('open-orders summary translations', () => {
  it('sends the review request, never a request to seal', () => {
    expect(OPEN_ORDERS_SEAL_REQUEST_KEY).toBe(REVIEW_REQUEST_KEY);
  });

  it.each(CORE_LANGUAGES)('no longer carries the retired seal request in %s', (language) => {
    expect(load(language)[RETIRED_SEAL_REQUEST_KEY]).toBeUndefined();
  });

  it.each(CORE_LANGUAGES)('has every key filled in %s', (language) => {
    const translations = load(language);

    REQUIRED_KEYS.forEach((key) => {
      expect(translations[key]?.trim(), `${key} in ${language}`).toBeTruthy();
    });
  });

  it.each(CORE_LANGUAGES)('interpolates both numbers in the general sentence in %s', (language) => {
    const general = load(language)[OPEN_ORDERS_SUMMARY_I18N.General];

    expect(general).toContain(COUNT);
    expect(general).toContain(SOON_COUNT);
  });

  it.each(CORE_LANGUAGES)('names the order count in the several-orders variants in %s', (language) => {
    const translations = load(language);

    expect(translations[OPEN_ORDERS_SUMMARY_I18N.ManyNoneSoon]).toContain(COUNT);
    expect(translations[OPEN_ORDERS_SUMMARY_I18N.ManyOneSoon]).toContain(COUNT);
    expect(translations[OPEN_ORDERS_SUMMARY_I18N.ManyNoneSoon]).not.toContain(SOON_COUNT);
  });

  it.each(CORE_LANGUAGES)('keeps the single-order variants free of placeholders in %s', (language) => {
    const translations = load(language);

    expect(translations[OPEN_ORDERS_SUMMARY_I18N.OneNoneSoon]).not.toContain('{{');
    expect(translations[OPEN_ORDERS_SUMMARY_I18N.OneSoon]).not.toContain('{{');
  });

  it.each(CORE_LANGUAGES)('measures the goal in days with open orders in %s', (language) => {
    const rationale = load(language)[GOAL_RATIONALE_KEY];

    expect(rationale).toContain(COUNT);
    expect(rationale).toContain('{{days}}');
  });
});
