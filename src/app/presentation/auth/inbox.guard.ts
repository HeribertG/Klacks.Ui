// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Route guard that blocks the inbox when no mail account is configured. This is a feature that was
 * never activated, not a missing right, and the reason is recorded as such before the redirect.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { InboxVisibilityService } from 'src/app/domain/services/email/inbox-visibility.service';
import {
  NO_ACCESS_REASON_FEATURE,
  NO_ACCESS_REASON_QUERY_PARAM,
} from 'src/app/domain/constants/no-access-reason.constants';
import { NoAccessReasonService } from 'src/app/domain/services/navigation/no-access-reason.service';

export const InboxGuard: CanActivateFn = async () => {
  const inboxVisibilityService = inject(InboxVisibilityService);
  const noAccessReason = inject(NoAccessReasonService);
  const router = inject(Router);

  await inboxVisibilityService.ensureSettingsLoaded();

  if (!inboxVisibilityService.isAvailable()) {
    noAccessReason.set(NO_ACCESS_REASON_FEATURE);
    router.navigate(['/no-access'], {
      queryParams: { [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_FEATURE },
    });
    return false;
  }

  return true;
};
