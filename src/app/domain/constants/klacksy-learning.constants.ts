// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export const KLACKSY_LEARNING_PHRASE_SOURCE = {
  Learned: 'learned',
  Description: 'description',
} as const;

export const KLACKSY_LEARNING_PHRASE_STATUS = {
  Active: 'active',
  Pending: 'pending',
  AppliedAuto: 'applied_auto',
  BlockedRegression: 'blocked_regression',
} as const;

export const KLACKSY_LEARNING_WISH_STATUS = {
  Ready: 'ready',
  Unfulfillable: 'unfulfillable',
} as const;

export const KLACKSY_LEARNING_DELETE_CONTEXT = {
  Phrases: 'klacksyLearningPhrases',
  Capabilities: 'klacksyLearningCapabilities',
  Wishes: 'klacksyLearningWishes',
} as const;

/**
 * Path prefixes under the assistant base URL whose 400/404/409 responses are already handled by the
 * calling component's own toasts, so the HTTP interceptor's generic error toast must stay out of the way.
 */
export const KLACKSY_LEARNING_INTERCEPTOR_PASS_THROUGH_PATHS = [
  'assistant/learning/',
] as const;

export const KLACKSY_LEARNING_APPROVE_ACTION = 'approve';

export const KLACKSY_LEARNING_DEFAULT_PHRASE_LIMIT = 50;

export const KLACKSY_LEARNING_MIN_PHRASE_LENGTH = 3;

export const KLACKSY_LEARNING_EMPTY_VALUE = '–';

export const KLACKSY_LEARNING_RUN_PATH = 'run';

export const KLACKSY_LEARNING_UNFULFILLABLE_PATH = 'unfulfillable';

export const KLACKSY_LEARNING_RETRY_ACTION = 'retry';

/**
 * The status a rejected description proposal answers with when its automatic adoption could no longer
 * be undone: the live description was changed by something else in the meantime, so the proposal is
 * marked discarded but nothing is restored.
 */
export const KLACKSY_LEARNING_CONFLICT_STATUS = 409;

/**
 * The refusal reasons POST learning/run can answer with, verbatim as the backend writes them
 * (SkillLearningRunLauncher). Anything else is mapped to the generic not-started text.
 */
export const KLACKSY_LEARNING_RUN_REASON = {
  AlreadyRunning: 'A learning run is already in progress.',
} as const;

/**
 * Grace period before the lists are refetched after a run was started. A run takes minutes, so this
 * only picks up what the first stages already wrote, not the whole result.
 */
export const KLACKSY_LEARNING_RUN_RELOAD_DELAY_MS = 2000;
