// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { InjectionToken } from '@angular/core';
import { IRowHeaderSettings } from './row-header-settings.interface';
import { IRowHeaderDataProvider } from './row-header-data-provider.interface';

export const ROW_HEADER_SETTINGS = new InjectionToken<IRowHeaderSettings>('ROW_HEADER_SETTINGS');
export const ROW_HEADER_DATA = new InjectionToken<IRowHeaderDataProvider>('ROW_HEADER_DATA');
