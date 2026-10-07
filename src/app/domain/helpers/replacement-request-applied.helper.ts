// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tells whether a stored replacement request was already applied to the real plan; such a row is read-only.
 * @param request - The stored request row, or nothing when no row exists
 */
import { IReplacementRequest } from '../interfaces/replacement-request.interface';

export function isReplacementRequestApplied(request: IReplacementRequest | null | undefined): boolean {
  return !!request?.appliedAtUtc;
}
