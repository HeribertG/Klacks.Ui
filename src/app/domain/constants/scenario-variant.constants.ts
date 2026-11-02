// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the variant (key) management UI: the backend path of the ScenarioVariants endpoints (also the
 * interceptor's pass-through path), the default length of a new key's period and the i18n key of the notice shown when
 * variant mode ends because a shift outside the key was opened.
 * @param SCENARIO_VARIANTS_PATH - Backend path segment of all variant endpoints
 * @param SCENARIO_VARIANT_SHIFTS_SEGMENT - Last path segment of the read of the shifts of a key
 * @param ANALYSE_SCENARIOS_PATH - Backend path segment of the scenario endpoints; a POST to it creates a scenario
 * @param SCENARIO_VARIANT_PASS_THROUGH_STATUS_CODES - Statuses of the variant endpoints the variant dialog explains
 *   itself (refused input, key already gone, key still used by an active scenario); the interceptor adds no generic
 *   toast for them
 * @param SCENARIO_VARIANT_ERROR_CODES - Codes of the server's 409 answers about variants (ScenarioVariantErrorCodes)
 * @param SCENARIO_VARIANT_REFUSAL_KEY_BY_CODE - i18n key that explains each coded conflict
 * @param SCENARIO_VARIANT_REFUSAL_KEY_BY_STATUS - i18n key of a refusal without a code
 * @param SCENARIO_VARIANT_REFUSAL_TOAST_NAME - Toast name of a coded conflict outside the key dialog (shift screens)
 * @param SCENARIO_VARIANT_DEFAULT_PERIOD_DAYS - Days a new key spans after its first day when the form is opened
 * @param SCENARIO_VARIANT_LEFT_FOR_FOREIGN_SHIFT_KEY - i18n key of the notice that variant mode ended
 * @param SCENARIO_VARIANT_SHIFT_SAVE_PATH - Last path segment of the shift save (POST and PUT)
 * @param SCENARIO_VARIANT_CUT_PATHS - Path ends of the cut writes, whose refusal of a key shift reads like a refused save
 * @param SCENARIO_VARIANT_SHIFT_REFUSED_KEY - i18n key of a key shift the server refuses as invalid: without a code the Ui
 *   cannot tell the broken rule, so the text names the rules of a key shift
 * @param SCENARIO_VARIANT_COPY_REFUSED_KEY - i18n key of a copy the server refuses as invalid, for the same reason it names
 *   the rules of a copy
 * @param SCENARIO_VARIANT_ACCEPT_COPIED_SHIFTS_KEYS - Singular and plural i18n key of the accept warning about copies
 * @param SCENARIO_VARIANT_SUMMARY_COPIED_SHIFTS_KEYS - Singular and plural i18n key of that warning on one key of the summary
 * @param SCENARIO_VARIANT_MARKER_FALLBACK_COLOR - Colour of the key marker until the theme's warning colour is read
 * @param SCENARIO_VARIANT_RETURN_ROUTE - Route the shift edit and cut screens return to in variant mode (the plain shift list
 *   shows real shifts only)
 */

import { HttpStatusCode } from '@angular/common/http';

export const SCENARIO_VARIANTS_PATH = 'ScenarioVariants';

export const SCENARIO_VARIANT_SHIFTS_SEGMENT = '/Shifts';

export const ANALYSE_SCENARIOS_PATH = 'AnalyseScenarios';

export const SCENARIO_VARIANT_PASS_THROUGH_STATUS_CODES: readonly number[] = [
  HttpStatusCode.BadRequest,
  HttpStatusCode.NotFound,
  HttpStatusCode.Conflict,
];

export const SCENARIO_VARIANT_ERROR_CODES = {
  Consumed: 'SCENARIO_VARIANT_CONSUMED',
  InUse: 'SCENARIO_VARIANT_IN_USE',
  ShiftCloned: 'SCENARIO_VARIANT_SHIFT_CLONED',
  ShiftHasCuts: 'SCENARIO_VARIANT_SHIFT_HAS_CUTS',
  ShiftsOutsidePeriod: 'SCENARIO_VARIANT_SHIFTS_OUTSIDE_PERIOD',
} as const;

export const SCENARIO_VARIANT_REFUSAL_KEY_BY_CODE: Readonly<Record<string, string>> = {
  [SCENARIO_VARIANT_ERROR_CODES.Consumed]: 'scenarioVariant.error.consumed',
  [SCENARIO_VARIANT_ERROR_CODES.InUse]: 'scenarioVariant.error.inUse',
  [SCENARIO_VARIANT_ERROR_CODES.ShiftCloned]: 'scenarioVariant.error.shiftCloned',
  [SCENARIO_VARIANT_ERROR_CODES.ShiftHasCuts]: 'scenarioVariant.error.shiftHasCuts',
  [SCENARIO_VARIANT_ERROR_CODES.ShiftsOutsidePeriod]: 'scenarioVariant.error.shiftsOutsidePeriod',
};

export const SCENARIO_VARIANT_REFUSAL_KEY_BY_STATUS: Readonly<Record<number, string>> = {
  [HttpStatusCode.BadRequest]: 'scenarioVariant.error.invalid',
  [HttpStatusCode.NotFound]: 'scenarioVariant.error.gone',
  [HttpStatusCode.Conflict]: 'scenarioVariant.error.conflict',
};

export const SCENARIO_VARIANT_REFUSAL_TOAST_NAME = 'scenario-variant-refused';

export const SCENARIO_VARIANT_SHIFT_SAVE_PATH = 'Shifts/';

export const SCENARIO_VARIANT_CUT_PATHS: readonly string[] = ['Shifts/Cuts/Batch', 'Shifts/Cuts/Reset'];

export const SCENARIO_VARIANT_SHIFT_REFUSED_KEY = 'scenarioVariant.error.shiftRefused';

export const SCENARIO_VARIANT_COPY_REFUSED_KEY = 'scenarioVariant.copy.refused';

export const SCENARIO_VARIANT_ACCEPT_COPIED_SHIFTS_KEYS = {
  one: 'scenarioVariant.accept.copiedShifts.one',
  other: 'scenarioVariant.accept.copiedShifts.other',
} as const;

export const SCENARIO_VARIANT_SUMMARY_COPIED_SHIFTS_KEYS = {
  one: 'scenarioVariant.summary.copiedShifts.one',
  other: 'scenarioVariant.summary.copiedShifts.other',
} as const;

export const SCENARIO_VARIANT_DEFAULT_PERIOD_DAYS = 27;

export const SCENARIO_VARIANT_LEFT_FOR_FOREIGN_SHIFT_KEY = 'scenarioVariant.leftForForeignShift';

export const SCENARIO_VARIANT_RETURN_ROUTE = '/workplace/schedule';

export const SCENARIO_VARIANT_MARKER_FALLBACK_COLOR = '#f59e0b';
