// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PersonalAccessTokenAccessMode } from './personal-access-token-access-mode.type';

export interface IPersonalAccessTokenCreated {
  id: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string;
  token: string;
  accessMode: PersonalAccessTokenAccessMode;
}
