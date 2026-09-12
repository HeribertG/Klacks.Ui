// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Maps Klacksy in-page target IDs on the training review page to the tab
 * that must be activated before the target's marker exists in the DOM.
 */
import {
  KLACKSY_TRAINING_TAB_FEEDBACK,
  KLACKSY_TRAINING_TAB_MANUAL,
  KLACKSY_TRAINING_TAB_METRICS,
  KLACKSY_TRAINING_TAB_TARGETS,
  KlacksyTrainingTab,
} from './klacksy-training-tab-keys.constants';

export const KLACKSY_TRAINING_TARGET_TABS: Record<string, KlacksyTrainingTab> = {
  'klacksy-training.targets': KLACKSY_TRAINING_TAB_TARGETS,
  'klacksy-training.feedback': KLACKSY_TRAINING_TAB_FEEDBACK,
  'klacksy-training.metrics': KLACKSY_TRAINING_TAB_METRICS,
  'klacksy-training.manual': KLACKSY_TRAINING_TAB_MANUAL,
};
