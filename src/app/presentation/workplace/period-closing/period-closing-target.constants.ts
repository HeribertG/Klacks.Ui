// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Klacksy in-page target ids of the period-closing page that page logic reacts to.
 * The literal ids in the templates (data-klacksy-target) are the source of truth for the manifest scan;
 * these constants only name the ones a KLACKSY_TARGET_REQUESTED handler has to recognise.
 */

export type ExportsTabKey = 'single' | 'employee' | 'range';

export const PERIOD_CLOSING_ISSUES_TARGET = 'period-closing-issues';

const EXPORTS_TAB_TARGET_PREFIX = 'period-closing-export-';

export const EXPORTS_TAB_TARGETS: Readonly<Record<string, ExportsTabKey>> = {
  [`${EXPORTS_TAB_TARGET_PREFIX}tab-single`]: 'single',
  [`${EXPORTS_TAB_TARGET_PREFIX}single-filter`]: 'single',
  [`${EXPORTS_TAB_TARGET_PREFIX}single-order`]: 'single',
  [`${EXPORTS_TAB_TARGET_PREFIX}single-format`]: 'single',
  [`${EXPORTS_TAB_TARGET_PREFIX}single-export`]: 'single',
  [`${EXPORTS_TAB_TARGET_PREFIX}tab-employee`]: 'employee',
  [`${EXPORTS_TAB_TARGET_PREFIX}employee-form`]: 'employee',
  [`${EXPORTS_TAB_TARGET_PREFIX}employee-format`]: 'employee',
  [`${EXPORTS_TAB_TARGET_PREFIX}employee-group`]: 'employee',
  [`${EXPORTS_TAB_TARGET_PREFIX}employee-export`]: 'employee',
  [`${EXPORTS_TAB_TARGET_PREFIX}tab-range`]: 'range',
  [`${EXPORTS_TAB_TARGET_PREFIX}range-form`]: 'range',
  [`${EXPORTS_TAB_TARGET_PREFIX}range-format`]: 'range',
  [`${EXPORTS_TAB_TARGET_PREFIX}range-export`]: 'range',
};
