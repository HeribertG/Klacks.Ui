// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Decides whether a failed seal should be re-offered for confirmation, and with which error count.
 * Returns undefined when it must not: anything but a 409, or a repeated refusal reporting the very
 * count that was just confirmed - retrying that would loop forever. A 409 without a machine-readable
 * count comes from a backend that does not re-check and is confirmed the legacy way (count null).
 * @param err - The failed HTTP response
 * @param acknowledgeViolations - Whether this attempt already carried a confirmation
 * @param acknowledgedErrorCount - The count that confirmation was issued for
 */

const HTTP_STATUS_CONFLICT = 409;

interface SealConflictBody {
  currentErrorCount?: number;
}

export function errorCountToReconfirm(
  err: { status?: number; error?: SealConflictBody } | null | undefined,
  acknowledgeViolations: boolean,
  acknowledgedErrorCount: number | null,
): number | null | undefined {
  if (err?.status !== HTTP_STATUS_CONFLICT) {
    return undefined;
  }
  const reported = err?.error?.currentErrorCount;
  const currentErrorCount = typeof reported === 'number' ? reported : null;
  if (!acknowledgeViolations) {
    return currentErrorCount;
  }
  return currentErrorCount !== null && currentErrorCount !== acknowledgedErrorCount ? currentErrorCount : undefined;
}
