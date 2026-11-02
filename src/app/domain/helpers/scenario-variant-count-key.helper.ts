// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Picks the singular or the plural translation key of a variant (key) count text.
 * @param keys - Singular ("one") and plural ("other") key of the text
 * @param count - Number the text shows; exactly 1 selects the singular
 */

const SINGULAR_COUNT = 1;

export function scenarioVariantCountKey(keys: Readonly<Record<'one' | 'other', string>>, count: number): string {
  return count === SINGULAR_COUNT ? keys.one : keys.other;
}
