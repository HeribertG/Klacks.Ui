// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
