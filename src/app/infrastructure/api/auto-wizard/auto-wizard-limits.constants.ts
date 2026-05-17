// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Hard limits and warning thresholds for the AutoWizard orchestrator. Mirror of the
 * backend AutoWizardLimits constants. Frontend uses these in a precheck so the spinner
 * never runs against a workload the backend will reject (or silently time out on).
 */
export const AUTO_WIZARD_LIMITS = {
  maxAgents: 250,
  maxShifts: 80,
  maxSlotProduct: 25_000,
  warnAgents: 120,
  tooLargeErrorCode: 'AUTO_WIZARD_TOO_LARGE',
} as const;
