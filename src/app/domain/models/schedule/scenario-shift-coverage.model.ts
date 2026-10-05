// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ScenarioShiftCoverage {
  shiftId: string;
  shiftName: string;
  abbreviation: string;
  demandedSlots: number;
  filledSlots: number;
  openSlots: number;
}
