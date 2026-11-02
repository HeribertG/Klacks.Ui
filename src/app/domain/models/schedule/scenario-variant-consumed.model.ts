// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The server refuses to accept a scenario whose variants were already consumed by another accepted scenario with
 * a 409 carrying this error code and the names of the consumed variants. There is no override: the scenario can
 * only be discarded. It must not be mistaken for the compliance block, which is also a 409 but offers an override.
 */
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { SCENARIO_VARIANT_ERROR_CODES } from 'src/app/domain/constants/scenario-variant.constants';

function readConflictBody(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== HttpStatusCode.Conflict) {
    return null;
  }

  const body = error.error as Record<string, unknown> | null;
  return body && body['errorCode'] === SCENARIO_VARIANT_ERROR_CODES.Consumed ? body : null;
}

/** Recognises the server's "a variant of this scenario was already consumed" conflict. */
export function isScenarioVariantConsumedError(error: unknown): boolean {
  return readConflictBody(error) !== null;
}

/** Names of the consumed variants of that conflict (empty when the server sent none), or null for any other error. */
export function readConsumedVariantNames(error: unknown): string[] | null {
  const body = readConflictBody(error);
  if (!body) {
    return null;
  }

  const names = body['variantNames'];
  return Array.isArray(names) ? names.map((name) => String(name)) : [];
}
