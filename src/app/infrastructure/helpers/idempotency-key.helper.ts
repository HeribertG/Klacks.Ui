// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the request options of a creating call with a fresh Idempotency-Key. Call it once per user action, outside the
 * retry: the header becomes part of the HttpRequest, so every retry of that request sends the same key and the server
 * answers a repeat from the first execution instead of creating the entry twice.
 */

import { HttpHeaders } from '@angular/common/http';
import { IDEMPOTENCY_KEY_HEADER } from 'src/app/domain/constants/idempotency-key.constants';

export function idempotentRequestOptions(): { headers: HttpHeaders } {
  return { headers: new HttpHeaders({ [IDEMPOTENCY_KEY_HEADER]: crypto.randomUUID() }) };
}
