// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Coverage of one variant inside a scenario summary: how many of the variant's slots the scenario leaves open.
 * @param peakOpenSlots - Open slots on the worst single day
 * @param peakDate - Calendar day of that worst day, null when nothing is open
 * @param copiedShiftCount - Orders of the key that are copies of a shift that is still alive and overlaps the key's
 *   period: after the accept both count, so the demand is doubled
 */
export interface IScenarioVariantCoverage {
  variantId: string;
  name: string;
  demandedSlots: number;
  filledSlots: number;
  openSlots: number;
  peakOpenSlots: number;
  peakDate: string | null;
  copiedShiftCount: number;
}
