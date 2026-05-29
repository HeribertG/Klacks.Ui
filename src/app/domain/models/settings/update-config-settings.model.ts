// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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

export class UpdateConfigSettings implements IUpdateConfigSettings {
  autoEnabled = false;
  channel = 'Stable';
  checkIntervalHours = 6;
  maintenanceWindowStart = '';
  maintenanceWindowEnd = '';
  notifyOnly = false;
  backupRetentionCount = 3;
  pinnedVersion = '';
}
