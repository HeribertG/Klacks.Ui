// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Returns a copy of the state tokens in ascending order of their displayed state code, with the country code as tie-breaker.
 * @param tokens - State tokens as delivered by the backend, in database order
 * @param locale - Active application language code used for the collation, or undefined for the runtime default
 */

import { StateCountryToken } from 'src/app/domain/models/calendar/state-country-token-class';

const COLLATOR_OPTIONS: Intl.CollatorOptions = { sensitivity: 'base' };

export function sortStateTokens(tokens: StateCountryToken[], locale?: string): StateCountryToken[] {
  const collator = new Intl.Collator(locale, COLLATOR_OPTIONS);
  return [...tokens].sort(
    (a, b) => collator.compare(a.state, b.state) || collator.compare(a.country, b.country)
  );
}
