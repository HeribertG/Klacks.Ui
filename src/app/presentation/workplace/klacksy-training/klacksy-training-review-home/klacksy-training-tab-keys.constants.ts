// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Canonical tab-key strings for the Klacksy training review page. Shared
 * between the component (active tab state) and klacksy-training-target-tabs.constants.ts
 * so both stay in lock-step with a single source of truth.
 */
export const KLACKSY_TRAINING_TAB_TARGETS = 'targets';
export const KLACKSY_TRAINING_TAB_FEEDBACK = 'feedback';
export const KLACKSY_TRAINING_TAB_METRICS = 'metrics';
export const KLACKSY_TRAINING_TAB_MANUAL = 'manual';

export type KlacksyTrainingTab =
  | typeof KLACKSY_TRAINING_TAB_TARGETS
  | typeof KLACKSY_TRAINING_TAB_FEEDBACK
  | typeof KLACKSY_TRAINING_TAB_METRICS
  | typeof KLACKSY_TRAINING_TAB_MANUAL;
