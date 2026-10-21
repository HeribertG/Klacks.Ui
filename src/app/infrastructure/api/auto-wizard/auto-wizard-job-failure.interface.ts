// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reported when the chain stopped. A later stage failing does not mean the earlier ones produced
 * nothing - the partial scenario is kept and named here so the operator can still use it.
 */
export interface AutoWizardJobFailure {
  jobId: string;
  failedStage: string;
  reason: string;
  partialScenarioId: string | null;
  partialScenarioToken: string | null;
  partialScenarioName: string | null;
}
