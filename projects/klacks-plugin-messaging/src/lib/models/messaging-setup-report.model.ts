// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Full messaging setup diagnosis returned by GET messaging/setup-diagnosis, matching the backend's
 * MessagingSetupReport.
 */
import { SetupStep } from './setup-step.model';
import { ProviderSetupReport } from './provider-setup-report.model';

export interface MessagingSetupReport {
  pluginSteps: SetupStep[];
  providers: ProviderSetupReport[];
}
