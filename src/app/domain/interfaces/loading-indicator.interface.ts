// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { InjectionToken } from '@angular/core';

export interface ILoadingIndicator {
  showProgressSpinner: boolean;
}

export const LOADING_INDICATOR_TOKEN = new InjectionToken<ILoadingIndicator>('ILoadingIndicator');
