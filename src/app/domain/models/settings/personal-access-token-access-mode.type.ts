// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PERSONAL_ACCESS_TOKEN_ACCESS_MODE } from './personal-access-token';

export type PersonalAccessTokenAccessMode =
  (typeof PERSONAL_ACCESS_TOKEN_ACCESS_MODE)[keyof typeof PERSONAL_ACCESS_TOKEN_ACCESS_MODE];
