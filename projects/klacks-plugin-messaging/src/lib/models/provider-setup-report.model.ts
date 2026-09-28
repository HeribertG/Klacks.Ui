// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Per-provider slice of the messaging setup diagnosis, matching the backend's ProviderSetupReport.
 */
import { SetupStep } from './setup-step.model';

export interface ProviderSetupReport {
  providerName: string;
  providerType: string;
  isEnabled: boolean;
  steps: SetupStep[];
  nextStep: SetupStep | null;
}
