// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PersonalAccessTokenAccessMode } from 'src/app/domain/models/settings/personal-access-token-access-mode.type';

export interface PersonalAccessTokenFormModel {
  name: string;
  expiresInDays: string;
  accessMode: PersonalAccessTokenAccessMode;
}
