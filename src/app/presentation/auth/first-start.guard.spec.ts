// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { FirstStartSetupStatusService } from 'src/app/domain/services/setup/first-start-setup-status.service';
import { AuthService } from './auth.service';
import { firstStartLoginGuard, firstStartPageGuard } from './first-start.guard';

describe('first-start guards', () => {
  let authService: any;
  let firstStartStatus: any;

  const run = (guard: typeof firstStartLoginGuard) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as Promise<boolean | UrlTree>;

  const serialize = (result: boolean | UrlTree): string | boolean =>
    result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;

  beforeEach(() => {
    authService = { authenticated: vi.fn().mockReturnValue(false) };
    firstStartStatus = { isPending: vi.fn().mockResolvedValue(false) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: FirstStartSetupStatusService, useValue: firstStartStatus },
      ],
    });
  });

  describe('firstStartLoginGuard', () => {
    it('sends a visitor without a session to the first-start page while the setup is pending', async () => {
      firstStartStatus.isPending.mockResolvedValue(true);

      expect(serialize(await run(firstStartLoginGuard))).toBe('/first-start');
    });

    it('shows the login page when the installation was already claimed', async () => {
      expect(await run(firstStartLoginGuard)).toBe(true);
    });

    it('never asks the backend for a signed-in user', async () => {
      authService.authenticated.mockReturnValue(true);
      firstStartStatus.isPending.mockResolvedValue(true);

      expect(await run(firstStartLoginGuard)).toBe(true);
      expect(firstStartStatus.isPending).not.toHaveBeenCalled();
    });
  });

  describe('firstStartPageGuard', () => {
    it('opens the page while the first start is pending', async () => {
      firstStartStatus.isPending.mockResolvedValue(true);

      expect(await run(firstStartPageGuard)).toBe(true);
    });

    it('leads to the login page once the first start is no longer available', async () => {
      expect(serialize(await run(firstStartPageGuard))).toBe('/login');
    });
  });
});
