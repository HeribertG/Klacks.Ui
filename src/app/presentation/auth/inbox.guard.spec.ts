// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { InboxGuard } from './inbox.guard';
import { InboxVisibilityService } from 'src/app/domain/services/email/inbox-visibility.service';
import { NoAccessReasonService } from 'src/app/domain/services/navigation/no-access-reason.service';
import {
  NO_ACCESS_REASON_FEATURE,
  NO_ACCESS_REASON_QUERY_PARAM,
} from 'src/app/domain/constants/no-access-reason.constants';

describe('InboxGuard', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let inboxVisibility: {
    ensureSettingsLoaded: ReturnType<typeof vi.fn>;
    isAvailable: ReturnType<typeof vi.fn>;
  };
  let noAccessReason: NoAccessReasonService;

  const run = (): Promise<boolean> =>
    TestBed.runInInjectionContext(
      () =>
        InboxGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot,
        ) as Promise<boolean>,
    );

  beforeEach(() => {
    router = { navigate: vi.fn() };
    inboxVisibility = {
      ensureSettingsLoaded: vi.fn().mockResolvedValue(undefined),
      isAvailable: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: InboxVisibilityService, useValue: inboxVisibility },
      ],
    });
    noAccessReason = TestBed.inject(NoAccessReasonService);
  });

  it('lets a configured inbox through and records no reason', async () => {
    expect(await run()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(noAccessReason.consume()).toBeNull();
  });

  it('treats a missing mail account as a feature that is not activated, not as a missing right', async () => {
    inboxVisibility.isAvailable.mockReturnValue(false);

    expect(await run()).toBe(false);
    expect(noAccessReason.consume()).toBe(NO_ACCESS_REASON_FEATURE);
  });

  it('puts the feature reason on the no-access url as well', async () => {
    inboxVisibility.isAvailable.mockReturnValue(false);

    await run();

    expect(router.navigate).toHaveBeenCalledWith(['/no-access'], {
      queryParams: { [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_FEATURE },
    });
  });
});
