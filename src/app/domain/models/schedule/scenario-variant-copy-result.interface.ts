// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Outcome of copying shifts into a variant. A family is a shift together with its cuts.
 * @param copiedFamilies - Shift families copied into the variant
 * @param skippedFamilies - Shift families left out, e.g. because the variant already holds a copy
 */
export interface IScenarioVariantCopyResult {
  copiedFamilies: number;
  skippedFamilies: number;
}
