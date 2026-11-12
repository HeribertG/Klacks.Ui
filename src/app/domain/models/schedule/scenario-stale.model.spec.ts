// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { readScenarioStaleness, SCENARIO_STALE_ERROR_CODE } from './scenario-stale.model';

describe('readScenarioStaleness', () => {
  const conflict = (body: Record<string, unknown> | null, status = 409): HttpErrorResponse =>
    new HttpErrorResponse({ status, error: body });

  const staleBody = {
    errorCode: SCENARIO_STALE_ERROR_CODE,
    changedEntryCount: 2,
    lastChangeUtc: '2027-03-10T08:00:00Z',
    acceptedScenarioNames: ['Cover A'],
  };

  it('returns null for another status, another code or no body', () => {
    expect(readScenarioStaleness(conflict(staleBody, 400))).toBeNull();
    expect(readScenarioStaleness(conflict({ ...staleBody, errorCode: 'OTHER' }))).toBeNull();
    expect(readScenarioStaleness(conflict(null))).toBeNull();
    expect(readScenarioStaleness(new Error('x'))).toBeNull();
  });

  it('reads an overridable warning without a cover preset', () => {
    const staleness = readScenarioStaleness(conflict({ ...staleBody, overridable: true }));

    expect(staleness).toEqual({
      changedEntryCount: 2,
      lastChangeUtc: '2027-03-10T08:00:00Z',
      acceptedScenarioNames: ['Cover A'],
      overridable: true,
      coverRedo: null,
    });
  });

  it('treats a body without the overridable flag as overridable', () => {
    expect(readScenarioStaleness(conflict(staleBody))?.overridable).toBe(true);
  });

  it('reads the cover preset of a warning that is not overridable', () => {
    const staleness = readScenarioStaleness(
      conflict({
        ...staleBody,
        overridable: false,
        coverClientId: 'client-1',
        coverAbsenceId: 'absence-1',
        coverFromDate: '2027-03-10',
        coverUntilDate: '2027-03-11',
      }),
    );

    expect(staleness?.overridable).toBe(false);
    expect(staleness?.coverRedo).toEqual({
      clientId: 'client-1',
      absenceId: 'absence-1',
      fromDate: '2027-03-10',
      untilDate: '2027-03-11',
    });
  });

  it('leaves out preset values the server sends as null', () => {
    const staleness = readScenarioStaleness(
      conflict({
        ...staleBody,
        overridable: false,
        coverClientId: null,
        coverAbsenceId: null,
        coverFromDate: '2027-03-10',
        coverUntilDate: null,
      }),
    );

    expect(staleness?.coverRedo).toEqual({
      clientId: undefined,
      absenceId: undefined,
      fromDate: '2027-03-10',
      untilDate: undefined,
    });
  });
});
