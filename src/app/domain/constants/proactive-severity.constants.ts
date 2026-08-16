// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Severity values a proactive message can carry, mirroring the backend's
 * Domain.Constants.AgentTriggerSeverity constants.
 */
export const PROACTIVE_SEVERITY = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
} as const;
