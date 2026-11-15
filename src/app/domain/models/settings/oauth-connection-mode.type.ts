// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { OAUTH_CONNECTION_MODE } from 'src/app/domain/constants/oauth-connection.constants';

export type OAuthConnectionMode = (typeof OAUTH_CONNECTION_MODE)[keyof typeof OAUTH_CONNECTION_MODE];
