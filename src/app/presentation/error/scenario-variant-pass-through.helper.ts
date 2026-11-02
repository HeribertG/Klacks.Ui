// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The requests of the key and new-scenario dialogs whose failure the HTTP interceptor leaves to the dialog, because the
 * dialog explains it in place, and the save and the cuts of a key shift, whose refusal the interceptor explains itself.
 * @param error - The failed response
 * @param req - The request behind it
 */

import { HttpErrorResponse, HttpRequest, HttpStatusCode } from '@angular/common/http';
import {
  ANALYSE_SCENARIOS_PATH,
  SCENARIO_VARIANT_CUT_PATHS,
  SCENARIO_VARIANT_PASS_THROUGH_STATUS_CODES,
  SCENARIO_VARIANT_SHIFT_SAVE_PATH,
  SCENARIO_VARIANT_SHIFTS_SEGMENT,
  SCENARIO_VARIANTS_PATH,
} from 'src/app/domain/constants/scenario-variant.constants';

const GET_METHOD = 'GET';
const POST_METHOD = 'POST';
const PUT_METHOD = 'PUT';
const SHIFT_SAVE_METHODS: readonly string[] = [POST_METHOD, PUT_METHOD];

const pathOf = (req: HttpRequest<unknown>): string => req.url.split('?')[0];

/** A refused request on any variant endpoint. */
export function isScenarioVariantEndpointRefusal(error: HttpErrorResponse): boolean {
  return (error.url || '').includes(SCENARIO_VARIANTS_PATH) && SCENARIO_VARIANT_PASS_THROUGH_STATUS_CODES.includes(error.status);
}

const carriesToken = (value: unknown): boolean => {
  const token = (value as { analyseToken?: unknown } | null | undefined)?.analyseToken;
  return typeof token === 'string' && token.trim() !== '';
};

const isVariantCutWrite = (req: HttpRequest<unknown>, isVariantMode: () => boolean): boolean => {
  const operations = (req.body as { operations?: { data?: unknown }[] } | null)?.operations ?? [];
  return (
    req.method === POST_METHOD &&
    SCENARIO_VARIANT_CUT_PATHS.some((path) => pathOf(req).endsWith(path)) &&
    (operations.some((operation) => carriesToken(operation.data)) || isVariantMode())
  );
};

/**
 * A save or a cut of a key shift the server refused as invalid. The token in the body tells a key shift from a real one;
 * a reset sends no shift, so there the active variant mode decides, which is asked last because it needs a lazy lookup.
 */
export function isVariantShiftSaveRefusal(
  error: HttpErrorResponse,
  req: HttpRequest<unknown>,
  isVariantMode: () => boolean,
): boolean {
  if (error.status !== HttpStatusCode.BadRequest) {
    return false;
  }

  const isKeyShiftSave =
    SHIFT_SAVE_METHODS.includes(req.method) && pathOf(req).endsWith(SCENARIO_VARIANT_SHIFT_SAVE_PATH) && carriesToken(req.body);
  return isKeyShiftSave || isVariantCutWrite(req, isVariantMode);
}

/** The read of the key list or of the shifts of a key: both have their own failed state, whatever the status. */
export function isScenarioVariantPanelRead(req: HttpRequest<unknown>): boolean {
  const path = pathOf(req);
  return (
    req.method === GET_METHOD &&
    (path.endsWith(SCENARIO_VARIANTS_PATH) ||
      (path.includes(`${SCENARIO_VARIANTS_PATH}/`) && path.endsWith(SCENARIO_VARIANT_SHIFTS_SEGMENT)))
  );
}

/** A refused create of a scenario; other scenario writes end on a segment of their own. */
export function isScenarioCreateRefusal(error: HttpErrorResponse, req: HttpRequest<unknown>): boolean {
  return (
    req.method === POST_METHOD &&
    pathOf(req).endsWith(ANALYSE_SCENARIOS_PATH) &&
    SCENARIO_VARIANT_PASS_THROUGH_STATUS_CODES.includes(error.status)
  );
}
