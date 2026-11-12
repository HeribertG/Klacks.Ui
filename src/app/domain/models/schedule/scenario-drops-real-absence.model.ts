// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The server refuses to accept a scenario that would delete real absences it does not carry (no scenario absence of the
 * same person, day and type) with a 409 carrying this error code. No override lifts it: the scenario has to be
 * recalculated on the current plan or discarded.
 */
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { readRefusalCode } from 'src/app/domain/helpers/read-refusal-code.helper';
import { IScenarioDroppedAbsences } from 'src/app/domain/interfaces/scenario-dropped-absences.interface';
import { IDroppedRealAbsence } from 'src/app/domain/interfaces/dropped-real-absence.interface';

export const SCENARIO_DROPS_REAL_ABSENCE_ERROR_CODE = 'SCENARIO_DROPS_REAL_ABSENCE';

/** Reads the absences of the server's "accept would delete real absences" conflict, or null for any other error. */
export function readScenarioDroppedAbsences(error: unknown): IScenarioDroppedAbsences | null {
  if (readRefusalCode(error, HttpStatusCode.Conflict) !== SCENARIO_DROPS_REAL_ABSENCE_ERROR_CODE) {
    return null;
  }

  const body = (error as HttpErrorResponse).error as Record<string, unknown>;

  const entries = body['droppedAbsences'];
  const droppedAbsences = Array.isArray(entries) ? entries.map((entry) => readDroppedAbsence(entry)) : [];
  return {
    droppedAbsenceCount: Math.max(Number(body['droppedAbsenceCount'] ?? 0), droppedAbsences.length),
    droppedAbsences,
  };
}

function readDroppedAbsence(entry: unknown): IDroppedRealAbsence {
  const item = (entry ?? {}) as Record<string, unknown>;
  return {
    clientId: String(item['clientId'] ?? ''),
    clientName: String(item['clientName'] ?? ''),
    date: String(item['date'] ?? ''),
    absenceId: String(item['absenceId'] ?? ''),
  };
}
