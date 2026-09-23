// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
