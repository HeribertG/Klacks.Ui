// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpContextToken } from '@angular/common/http';

export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

export const TOKEN_REFRESH_RETRIED = new HttpContextToken<boolean>(() => false);
