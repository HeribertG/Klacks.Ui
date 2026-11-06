// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Wire values of the keyword-wish evaluation: how a schedule-command wish was missed, the backend keyword names and
 * what became of the AutoWizard soft-keyword retry, plus the i18n keys the UI shows for them.
 */

export const KEYWORD_WISH_OUTCOME = {
  BrokenFree: 'BrokenFree',
  BrokenOnly: 'BrokenOnly',
  BrokenNo: 'BrokenNo',
  Unfulfilled: 'Unfulfilled',
} as const;

export const KEYWORD_WISH_OUTCOME_KEYS: Readonly<Record<string, string>> = {
  [KEYWORD_WISH_OUTCOME.BrokenFree]: 'keywordWishes.outcome.brokenFree',
  [KEYWORD_WISH_OUTCOME.BrokenOnly]: 'keywordWishes.outcome.brokenOnly',
  [KEYWORD_WISH_OUTCOME.BrokenNo]: 'keywordWishes.outcome.brokenNo',
  [KEYWORD_WISH_OUTCOME.Unfulfilled]: 'keywordWishes.outcome.unfulfilled',
};

export const KEYWORD_WISH_TIER_COUNT_KEYS = {
  brokenFree: 'keywordWishes.count.brokenFree',
  brokenOnly: 'keywordWishes.count.brokenOnly',
  brokenNo: 'keywordWishes.count.brokenNo',
  unfulfilled: 'keywordWishes.count.unfulfilled',
} as const;

export const KEYWORD_WISH_OUTCOME_UNKNOWN_KEY = 'keywordWishes.outcome.unknown';

export const KEYWORD_WISH_UNKNOWN_EMPLOYEE_KEY = 'keywordWishes.unknownEmployee';

export const SCHEDULE_COMMAND_KEYWORD = {
  Free: 'Free',
  NotFree: 'NotFree',
  OnlyEarly: 'OnlyEarly',
  NoEarly: 'NoEarly',
  OnlyLate: 'OnlyLate',
  NoLate: 'NoLate',
  OnlyNight: 'OnlyNight',
  NoNight: 'NoNight',
} as const;

export const AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME = {
  NotRequested: 'NotRequested',
  NotNeeded: 'NotNeeded',
  Kept: 'Kept',
  NotBetter: 'NotBetter',
  Promoted: 'Promoted',
  Failed: 'Failed',
} as const;

export type AutoWizardSoftKeywordRetryOutcome =
  (typeof AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME)[keyof typeof AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME];

export const AUTO_WIZARD_SOFT_ADDITIONAL_SLOTS_KEYS = {
  one: 'autoWizard.softAlternative.additionalSlots.one',
  other: 'autoWizard.softAlternative.additionalSlots.other',
} as const;
