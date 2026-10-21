// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IUpdateConfigSettings } from './update-config-settings.interface';

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
