// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Explains a WorkChange refused on a container in the user's language: a container is corrected through its inner
 * services and covered through a split. The server answers a coded 400; anything else keeps the generic handling.
 * @param error - The failed response
 */

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

export const CONTAINER_WORK_CHANGE_TOAST_NAME = 'container-work-change-refused';

const CONTAINER_WORK_CHANGE_KEYS: Readonly<Record<string, string>> = {
  CONTAINER_CORRECTION_REFUSED: 'schedule.container-work-change.correction-refused',
  CONTAINER_REPLACEMENT_REFUSED: 'schedule.container-work-change.replacement-refused',
};

export function containerWorkChangeRefusalKey(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== HttpStatusCode.BadRequest) {
    return null;
  }

  const code = (error.error as { errorCode?: unknown } | null)?.errorCode;
  return typeof code === 'string' ? (CONTAINER_WORK_CHANGE_KEYS[code] ?? null) : null;
}
