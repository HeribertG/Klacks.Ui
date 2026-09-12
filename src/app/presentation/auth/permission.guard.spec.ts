// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Data,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { permissionGuard } from './permission.guard';
import { ROUTE_DATA_REQUIRED_PERMISSION } from './route-data.constants';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { NoAccessReasonService } from 'src/app/domain/services/navigation/no-access-reason.service';
import { PERMISSIONS, ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import {
  NO_ACCESS_REASON_PERMISSION,
  NO_ACCESS_REASON_QUERY_PARAM,
} from 'src/app/domain/constants/no-access-reason.constants';

describe('permissionGuard', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let held: string[];

  const run = (data: Data): boolean =>
    TestBed.runInInjectionContext(
      () =>
        permissionGuard(
          { data } as unknown as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot,
        ) as boolean,
    );

  beforeEach(() => {
    router = { navigate: vi.fn() };
    held = [];

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => held.includes(permission) },
        },
      ],
    });
  });

  it('refuses a route that carries the guard but declares no permission, instead of passing it', () => {
    held = [ROLE_ADMIN];

    expect(run({})).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/no-access'], {
      queryParams: { [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_PERMISSION },
    });
  });

  it('refuses a route whose data object is missing entirely', () => {
    const outcome = TestBed.runInInjectionContext(
      () =>
        permissionGuard(
          {} as unknown as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot,
        ) as boolean,
    );

    expect(outcome).toBe(false);
  });

  it('lets the holder of the declared permission through', () => {
    held = [PERMISSIONS.CanViewSettings];

    expect(run({ [ROUTE_DATA_REQUIRED_PERMISSION]: PERMISSIONS.CanViewSettings })).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('refuses a user who lacks the declared permission', () => {
    held = [PERMISSIONS.CanViewClients];

    expect(run({ [ROUTE_DATA_REQUIRED_PERMISSION]: PERMISSIONS.CanViewSettings })).toBe(false);
  });

  it('guards a route that demands the admin role like any other right', () => {
    held = [ROLE_ADMIN];

    expect(run({ [ROUTE_DATA_REQUIRED_PERMISSION]: ROLE_ADMIN })).toBe(true);
  });

  it('records the permission reason before it refuses, so the caller can read it', () => {
    expect(run({ [ROUTE_DATA_REQUIRED_PERMISSION]: PERMISSIONS.CanViewSettings })).toBe(false);
    expect(TestBed.inject(NoAccessReasonService).consume()).toBe(NO_ACCESS_REASON_PERMISSION);
  });

  it('puts the reason on the no-access url as well, for a deep link or a reload', () => {
    run({ [ROUTE_DATA_REQUIRED_PERMISSION]: PERMISSIONS.CanViewSettings });

    expect(router.navigate).toHaveBeenCalledWith(['/no-access'], {
      queryParams: { [NO_ACCESS_REASON_QUERY_PARAM]: NO_ACCESS_REASON_PERMISSION },
    });
  });

  it('records the reason before navigating away, never after', () => {
    let reasonWhenRedirectStarted: string | null = null;
    router.navigate.mockImplementation(() => {
      reasonWhenRedirectStarted = TestBed.inject(NoAccessReasonService).consume();
      return Promise.resolve(true);
    });

    run({ [ROUTE_DATA_REQUIRED_PERMISSION]: PERMISSIONS.CanViewSettings });

    expect(reasonWhenRedirectStarted).toBe(NO_ACCESS_REASON_PERMISSION);
  });
});
