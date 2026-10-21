// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  NAVIGATION_REASON_TARGET_NOT_FOUND,
  NAVIGATION_REASON_PERMISSION_DENIED,
  NAVIGATION_REASON_FEATURE_DISABLED,
} from 'src/app/domain/constants/navigation-outcome.constants';

export interface NavigationResult {
  success: boolean;
  reason?:
    | typeof NAVIGATION_REASON_TARGET_NOT_FOUND
    | typeof NAVIGATION_REASON_PERMISSION_DENIED
    | typeof NAVIGATION_REASON_FEATURE_DISABLED;
}
