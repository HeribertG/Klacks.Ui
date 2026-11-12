// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Prefill for covering an absence again after its stale cover was refused, as sent in the SCENARIO_STALE conflict when
 * the warning is not overridable. Every value is absent when the server could not determine it uniquely.
 * @param clientId - The absent person, only when the cover added absences for exactly one person
 * @param absenceId - The absence type, only when exactly one person with exactly one type
 * @param fromDate - First day (yyyy-MM-dd) of the absences the cover added
 * @param untilDate - Last day (yyyy-MM-dd) of the absences the cover added
 */
export interface IScenarioCoverRedoPreset {
  clientId?: string;
  absenceId?: string;
  fromDate?: string;
  untilDate?: string;
}
