// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Fixed values of the schedule header: zoom and timeline row height sliders, the period navigation bounds,
 * the toast names, the bulk-send error placeholder, the tools overlay selectors and the wizard dropdown shortcut.
 */
import { Options } from '@angular-slider/ngx-slider';

export const SCHEDULE_HEADER_DEFAULT_ZOOM_VALUE = 100;
export const SCHEDULE_HEADER_PERCENT_BASE = 100;
export const SCHEDULE_HEADER_ZOOM_FACTOR_DECIMALS = 1;

export const SCHEDULE_HEADER_ZOOM_SLIDER_OPTIONS: Readonly<Options> = {
  floor: 50,
  ceil: 300,
  step: 10,
  showSelectionBarEnd: false,
  showSelectionBar: false,
};

export const SCHEDULE_HEADER_TIMELINE_SLIDER_OPTIONS: Readonly<Options> = {
  floor: 50,
  ceil: 200,
  step: 10,
  showSelectionBarEnd: false,
  showSelectionBar: false,
};

export const SCHEDULE_HEADER_WEEK_LABEL = 'KW';
export const SCHEDULE_HEADER_FIRST_MONTH = 1;
export const SCHEDULE_HEADER_LAST_MONTH = 12;
export const SCHEDULE_HEADER_FIRST_WEEK = 1;
export const SCHEDULE_HEADER_BIWEEKLY_STEP = 2;
export const SCHEDULE_HEADER_WEEK_PARITY_MODULUS = 2;
export const SCHEDULE_HEADER_ODD_REMAINDER = 1;
export const SCHEDULE_HEADER_DECEMBER_MONTH_INDEX = 11;
export const SCHEDULE_HEADER_LAST_DAY_OF_DECEMBER = 31;
export const SCHEDULE_HEADER_WEEKS_IN_SHORT_ISO_YEAR = 52;

export const SCHEDULE_HEADER_RECALCULATE_TOAST = 'recalculate';
export const SCHEDULE_HEADER_RECALCULATE_THOROUGH_TOAST = 'recalculate-thorough';
export const SCHEDULE_HEADER_BULK_SEND_TOAST = 'bulk-send';
export const SCHEDULE_HEADER_BULK_SEND_CLIENT_NAME = 'Bulk';

export const SCHEDULE_HEADER_TOOLS_SELECTOR = '.header-tools';
export const SCHEDULE_HEADER_TOOLS_TOGGLE_SELECTOR = '.header-tools-toggle';

export const SCHEDULE_HEADER_WIZARD_DROPDOWN_SHORTCUT_KEY = 'h';
export const SCHEDULE_HEADER_TEXT_INPUT_TAGS: readonly string[] = ['INPUT', 'TEXTAREA'];
