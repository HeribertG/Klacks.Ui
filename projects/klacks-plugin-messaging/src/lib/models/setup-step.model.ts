// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One deterministic checklist item of the messaging setup diagnosis, matching the backend's SetupStep.
 */
import { SetupStepStatus } from '../enums/setup-step-status.enum';

export interface SetupStep {
  code: string;
  status: SetupStepStatus;
  detail?: string | null;
  facts?: Record<string, string> | null;
}
