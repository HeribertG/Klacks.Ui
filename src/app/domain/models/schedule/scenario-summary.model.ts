// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ScenarioOpenSlotReason } from './scenario-open-slot-reason.model';
import { ScenarioShiftCoverage } from './scenario-shift-coverage.model';

export interface ScenarioSummary {
  token: string;
  fromDate: string;
  untilDate: string;
  agentCount: number;
  workCount: number;
  demandedSlots: number;
  filledSlots: number;
  openSlots: number;
  shifts: ScenarioShiftCoverage[];
  openSlotReasons: ScenarioOpenSlotReason[];
}
