// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MyToken } from 'src/app/domain/models/my-token-class';

export interface OAuth2Token extends MyToken {
  userName?: string;
  expires?: Date;
}
