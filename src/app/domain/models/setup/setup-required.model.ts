// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * While the seeded admin account still needs to be replaced with a real admin account, the
 * backend blocks every authenticated endpoint except session self-service and the setup
 * endpoints themselves with a 403 carrying this error code, so the frontend can recognise the
 * block and force a redirect instead of surfacing a generic "access denied" error toast.
 */
import { HttpErrorResponse } from '@angular/common/http';

export const SETUP_REQUIRED_ERROR_CODE = 'SETUP_REQUIRED';

/** Recognises the backend's own-admin-setup block on an otherwise arbitrary failed request. */
export function isSetupRequiredError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 403) {
    return false;
  }

  const body = error.error as Record<string, unknown> | null;
  return !!body && body['errorCode'] === SETUP_REQUIRED_ERROR_CODE;
}
