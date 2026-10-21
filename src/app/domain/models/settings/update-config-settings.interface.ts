// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUpdateConfigSettings {
  autoEnabled: boolean;
  channel: string;
  checkIntervalHours: number;
  maintenanceWindowStart: string;
  maintenanceWindowEnd: string;
  notifyOnly: boolean;
  backupRetentionCount: number;
  pinnedVersion: string;
}
