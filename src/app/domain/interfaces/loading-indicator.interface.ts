// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { InjectionToken } from '@angular/core';

export interface ILoadingIndicator {
  showProgressSpinner: boolean;
  interceptorSuppressed: boolean;
}

export const LOADING_INDICATOR_TOKEN = new InjectionToken<ILoadingIndicator>('ILoadingIndicator');
