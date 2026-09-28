// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Hard limits for a single Wizard 1 (planner GA) run. Mirror of the backend
 * WizardLimits constants. Frontend uses these in a precheck so the dialog never
 * starts a workload the backend will reject.
 */
export const WIZARD_LIMITS = {
  maxAgents: 100,
  maxShifts: 50,
  tooLargeErrorCode: 'WIZARD_TOO_LARGE',
} as const;
