// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SettingsModels } from 'src/app/domain/models/settings/settings-models.interface';

export interface AppSettingSerializer {
  key: string;
  serialize: (models: SettingsModels) => string;
}
