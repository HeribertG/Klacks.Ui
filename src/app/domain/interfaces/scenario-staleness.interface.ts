// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScenarioCoverRedoPreset } from './scenario-cover-redo-preset.interface';

/**
 * What changed in the original plan after a scenario was created, as sent in the body of the SCENARIO_STALE conflict.
 * @param changedEntryCount - Real entries in the scenario's scope created, updated or deleted since the scenario was created
 * @param lastChangeUtc - Instant (ISO, UTC) of the most recent of those changes; shown in the company time zone
 * @param acceptedScenarioNames - Other scenarios of the same group accepted since then (a likely cause); may be empty
 * @param overridable - False for the cover of an absence built on the real plan: no acknowledgement accepts it
 * @param coverRedo - Prefill for covering the absence again; null when the warning is overridable
 */
export interface IScenarioStaleness {
  changedEntryCount: number;
  lastChangeUtc: string;
  acceptedScenarioNames: string[];
  overridable: boolean;
  coverRedo: IScenarioCoverRedoPreset | null;
}
