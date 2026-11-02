// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The variant (key) endpoints answer refused input, a key that is already gone and a key still used by an active
 * scenario with 400, 404 or 409. The HTTP interceptor lets exactly these through without a generic toast, so the caller
 * has to explain them. The interceptor reports a 500 itself. For a server it cannot reach it only starts the silent
 * outage watch, so that case is reported by reportUnseenFailure. The server's detail is English and meant for logs: the
 * Ui explains a refusal by the code of a 409, else by its status.
 */
import { HttpErrorResponse } from '@angular/common/http';
import {
  SCENARIO_VARIANT_PASS_THROUGH_STATUS_CODES,
  SCENARIO_VARIANT_REFUSAL_KEY_BY_CODE,
  SCENARIO_VARIANT_REFUSAL_KEY_BY_STATUS,
} from 'src/app/domain/constants/scenario-variant.constants';

/** The i18n key of a coded variant conflict from any endpoint, otherwise null. */
export function readScenarioVariantConflictKey(error: HttpErrorResponse): string | null {
  const code = (error.error as { errorCode?: unknown } | null)?.errorCode;
  return typeof code === 'string' ? (SCENARIO_VARIANT_REFUSAL_KEY_BY_CODE[code] ?? null) : null;
}

/** The i18n key that explains the error when it is a refusal the caller must show, otherwise null. */
export function readScenarioVariantRefusalKey(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || !SCENARIO_VARIANT_PASS_THROUGH_STATUS_CODES.includes(error.status)) {
    return null;
  }

  return readScenarioVariantConflictKey(error) ?? SCENARIO_VARIANT_REFUSAL_KEY_BY_STATUS[error.status];
}
