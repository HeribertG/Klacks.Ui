// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { InboxVisibilityService } from 'src/app/domain/services/email/inbox-visibility.service';

export const InboxGuard: CanActivateFn = async () => {
  const inboxVisibilityService = inject(InboxVisibilityService);
  const router = inject(Router);

  await inboxVisibilityService.ensureSettingsLoaded();

  if (!inboxVisibilityService.isAvailable()) {
    router.navigate(['/no-access']);
    return false;
  }

  return true;
};
