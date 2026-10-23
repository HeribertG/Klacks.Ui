// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PlanCriticFinding } from './plan-critic-finding.interface';

/**
 * Vision-critic review attached to a stage-3 result (mirror of PlanCriticResultDto in Klacks.Api). Informational
 * only: the findings never changed the plan.
 * @param status - Skipped, Completed or Failed
 * @param modelId - Model that reviewed the plan; null when skipped before a model was chosen
 * @param findings - Verified findings
 * @param discardedFindingCount - Findings the backend dropped because a cited cell did not match the plan
 * @param message - Reason for Skipped or Failed
 */
export interface PlanCriticResult {
  status: string;
  modelId: string | null;
  findings: PlanCriticFinding[];
  discardedFindingCount: number;
  message: string | null;
}
