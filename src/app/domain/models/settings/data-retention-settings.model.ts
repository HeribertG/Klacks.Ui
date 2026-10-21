// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IDataRetentionSettings } from './data-retention-settings.interface';

export class DataRetentionSettings implements IDataRetentionSettings {
  dataRetentionDays = 3650;
}
