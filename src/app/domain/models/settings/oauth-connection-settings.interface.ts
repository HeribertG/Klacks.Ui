// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { OAuthConnectionMode } from 'src/app/domain/models/settings/oauth-connection-mode.type';

export interface IOAuthConnectionSettings {
  mode: OAuthConnectionMode;
  allowLoopback: boolean;
  allowWrite: boolean;
  customTargets: string[];
}
