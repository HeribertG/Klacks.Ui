// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IDroppedRealAbsence } from './dropped-real-absence.interface';

/**
 * The real absences an accept would delete, as sent in the body of the SCENARIO_DROPS_REAL_ABSENCE conflict.
 * @param droppedAbsenceCount - How many real absences the accept would delete in total
 * @param droppedAbsences - The first of them (capped by the server), ordered by day and name
 */
export interface IScenarioDroppedAbsences {
  droppedAbsenceCount: number;
  droppedAbsences: IDroppedRealAbsence[];
}
