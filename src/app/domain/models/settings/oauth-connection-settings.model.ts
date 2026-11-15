// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { OAUTH_CONNECTION_MODE } from 'src/app/domain/constants/oauth-connection.constants';
import { IOAuthConnectionSettings } from 'src/app/domain/models/settings/oauth-connection-settings.interface';
import { OAuthConnectionMode } from 'src/app/domain/models/settings/oauth-connection-mode.type';

export class OAuthConnectionSettings implements IOAuthConnectionSettings {
  mode: OAuthConnectionMode = OAUTH_CONNECTION_MODE.Trusted;
  allowLoopback = true;
  allowWrite = true;
  customTargets: string[] = [];
}
