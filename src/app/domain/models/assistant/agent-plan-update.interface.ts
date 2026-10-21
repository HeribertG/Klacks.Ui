// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PlanStatusValue } from './plan-status-value.type';

export interface IAgentPlanUpdate {
  planId: string;
  status: PlanStatusValue;
  currentStepIndex: number;
  totalSteps: number;
  lastErrorMessage?: string | null;
  timestamp: string;
}
