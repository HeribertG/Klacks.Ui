// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import {
  readScenarioDroppedAbsences,
  SCENARIO_DROPS_REAL_ABSENCE_ERROR_CODE,
} from './scenario-drops-real-absence.model';
import { SCENARIO_STALE_ERROR_CODE } from './scenario-stale.model';

describe('readScenarioDroppedAbsences', () => {
  const conflict = (body: Record<string, unknown> | null, status = 409): HttpErrorResponse =>
    new HttpErrorResponse({ status, error: body });

  const absence = {
    clientId: 'client-1',
    clientName: 'Elsa Muster',
    date: '2027-03-10',
    absenceId: 'absence-1',
  };

  it('returns null for another status, another code or no body', () => {
    const body = { errorCode: SCENARIO_DROPS_REAL_ABSENCE_ERROR_CODE, droppedAbsenceCount: 1, droppedAbsences: [absence] };

    expect(readScenarioDroppedAbsences(conflict(body, 400))).toBeNull();
    expect(readScenarioDroppedAbsences(conflict({ ...body, errorCode: SCENARIO_STALE_ERROR_CODE }))).toBeNull();
    expect(readScenarioDroppedAbsences(conflict(null))).toBeNull();
    expect(readScenarioDroppedAbsences(new Error('x'))).toBeNull();
  });

  it('reads the total and the listed absences', () => {
    const dropped = readScenarioDroppedAbsences(
      conflict({
        errorCode: SCENARIO_DROPS_REAL_ABSENCE_ERROR_CODE,
        droppedAbsenceCount: 3,
        droppedAbsences: [absence],
        overridable: false,
      }),
    );

    expect(dropped).toEqual({ droppedAbsenceCount: 3, droppedAbsences: [absence] });
  });

  it('never reports fewer absences than it lists and copes with a missing list', () => {
    expect(
      readScenarioDroppedAbsences(
        conflict({ errorCode: SCENARIO_DROPS_REAL_ABSENCE_ERROR_CODE, droppedAbsences: [absence, absence] }),
      )?.droppedAbsenceCount,
    ).toBe(2);
    expect(
      readScenarioDroppedAbsences(conflict({ errorCode: SCENARIO_DROPS_REAL_ABSENCE_ERROR_CODE, droppedAbsenceCount: 4 })),
    ).toEqual({ droppedAbsenceCount: 4, droppedAbsences: [] });
  });
});
