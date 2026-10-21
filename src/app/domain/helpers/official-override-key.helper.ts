// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

const OVERRIDE_KEY_SEPARATOR = '|';

/**
 * Builds the key of an official-holiday override entry (country and state of a selected calendar).
 * @param country - Country code of the selected calendar
 * @param state - State code of the selected calendar
 */
export function buildOfficialOverrideKey(
  country: string,
  state: string
): string {
  return `${country}${OVERRIDE_KEY_SEPARATOR}${state}`;
}
