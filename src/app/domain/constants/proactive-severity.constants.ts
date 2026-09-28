// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Severity values a proactive message can carry, mirroring the backend's
 * Domain.Constants.AgentTriggerSeverity constants.
 */
export const PROACTIVE_SEVERITY = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
} as const;
