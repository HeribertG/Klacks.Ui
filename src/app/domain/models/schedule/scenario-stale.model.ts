// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The server refuses to accept a scenario whose original plan changed after the scenario was created (another
 * scenario accepted in between, or edits by hand) with a 409 carrying this error code, because accepting would
 * overwrite those changes. It is neither the compliance block nor "not active": the client asks the user and retries
 * with overrideStale.
 */
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { IScenarioAcceptOverrides } from 'src/app/domain/interfaces/scenario-accept-overrides.interface';
import { IScenarioStaleness } from 'src/app/domain/interfaces/scenario-staleness.interface';

export const SCENARIO_STALE_ERROR_CODE = 'SCENARIO_STALE';

export const NO_SCENARIO_ACCEPT_OVERRIDES: IScenarioAcceptOverrides = { overrideBlock: false, overrideStale: false };

/** Reads the staleness details of the server's "scenario is stale" conflict, or null for any other error. */
export function readScenarioStaleness(error: unknown): IScenarioStaleness | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== HttpStatusCode.Conflict) {
    return null;
  }

  const body = error.error as Record<string, unknown> | null;
  if (!body || body['errorCode'] !== SCENARIO_STALE_ERROR_CODE) {
    return null;
  }

  const names = body['acceptedScenarioNames'];
  return {
    changedEntryCount: Number(body['changedEntryCount'] ?? 0),
    lastChangeUtc: String(body['lastChangeUtc'] ?? ''),
    acceptedScenarioNames: Array.isArray(names) ? names.map((name) => String(name)) : [],
  };
}
