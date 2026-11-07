// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Admin override that recalculates frozen (sealed and exported) pay periods too; recorded in the period audit log.
 * @param confirmFrozen - Always true when the override is sent
 * @param reason - Mandatory justification stored with the audit entry
 */
export interface IFrozenPeriodOverride {
  confirmFrozen: boolean;
  reason: string;
}
