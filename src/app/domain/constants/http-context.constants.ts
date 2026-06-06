// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpContextToken } from '@angular/common/http';

export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

export const TOKEN_REFRESH_RETRIED = new HttpContextToken<boolean>(() => false);
