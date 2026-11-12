// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The server refuses to accept a scenario whose original plan changed after the scenario was created (another
 * scenario accepted in between, edits, seals or a background recalculation) with a 409 carrying this error code,
 * because accepting would overwrite those changes. It is neither the compliance block nor "not active": the client
 * asks the user and retries with overrideStale. The cover of an absence built on the real plan comes back as not
 * overridable: no acknowledgement accepts it, and the body carries a prefill for covering the absence again.
 */
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { readRefusalCode } from 'src/app/domain/helpers/read-refusal-code.helper';
import { IScenarioAcceptOverrides } from 'src/app/domain/interfaces/scenario-accept-overrides.interface';
import { IScenarioStaleness } from 'src/app/domain/interfaces/scenario-staleness.interface';
import { IScenarioCoverRedoPreset } from 'src/app/domain/interfaces/scenario-cover-redo-preset.interface';

export const SCENARIO_STALE_ERROR_CODE = 'SCENARIO_STALE';

export const NO_SCENARIO_ACCEPT_OVERRIDES: IScenarioAcceptOverrides = { overrideBlock: false, overrideStale: false };

/** Reads the staleness details of the server's "scenario is stale" conflict, or null for any other error. */
export function readScenarioStaleness(error: unknown): IScenarioStaleness | null {
  if (readRefusalCode(error, HttpStatusCode.Conflict) !== SCENARIO_STALE_ERROR_CODE) {
    return null;
  }

  const body = (error as HttpErrorResponse).error as Record<string, unknown>;

  const names = body['acceptedScenarioNames'];
  const overridable = body['overridable'] !== false;
  return {
    changedEntryCount: Number(body['changedEntryCount'] ?? 0),
    lastChangeUtc: String(body['lastChangeUtc'] ?? ''),
    acceptedScenarioNames: Array.isArray(names) ? names.map((name) => String(name)) : [],
    overridable,
    coverRedo: overridable ? null : readCoverRedoPreset(body),
  };
}

function readCoverRedoPreset(body: Record<string, unknown>): IScenarioCoverRedoPreset {
  return {
    clientId: optionalText(body['coverClientId']),
    absenceId: optionalText(body['coverAbsenceId']),
    fromDate: optionalText(body['coverFromDate']),
    untilDate: optionalText(body['coverUntilDate']),
  };
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
