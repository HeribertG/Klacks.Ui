// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the request options for the account calls that set, renew or clear the HttpOnly refresh-token cookie:
 * credentials are sent even cross-site (dev UI on another origin) and the CSRF marker header the backend requires
 * is attached.
 */

import { HttpHeaders } from '@angular/common/http';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';

export function credentialedRequestOptions(): { withCredentials: true; headers: HttpHeaders } {
  return {
    withCredentials: true,
    headers: new HttpHeaders({ [X_REQUESTED_WITH_HEADER]: X_REQUESTED_WITH_VALUE }),
  };
}
