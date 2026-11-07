// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Injection token through which the surface events directive tells its availability surface that the scroll position
 * changed. The surface provides itself under this token, so the directive does not import the surface component and
 * the two files do not form an import cycle (a cycle left the directive undefined in the surface's compiled imports
 * whenever the directive module was evaluated first).
 */

import { InjectionToken } from '@angular/core';
import { IAvailabilitySurfaceScrollNotifier } from './availability-surface-scroll-notifier.interface';

export const AVAILABILITY_SURFACE_SCROLL_NOTIFIER = new InjectionToken<IAvailabilitySurfaceScrollNotifier>(
  'AVAILABILITY_SURFACE_SCROLL_NOTIFIER',
);
