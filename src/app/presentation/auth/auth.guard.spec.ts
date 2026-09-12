// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { NoAccessReasonService } from 'src/app/domain/services/navigation/no-access-reason.service';

const SETTINGS_URL = '/workplace/settings';

describe('AuthGuard', () => {
    let authService: any;
    let router: any;
    let noAccessReason: NoAccessReasonService;

    beforeEach(() => {
        const authServiceSpy = {
            authenticated: vi.fn()
        };
        const routerSpy = {
            navigate: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });

        authService = TestBed.inject(AuthService) as any;
        router = TestBed.inject(Router) as any;
        noAccessReason = TestBed.inject(NoAccessReasonService);
    });

    function executeGuard(url = '/someurl'): boolean {
        const state = { url } as RouterStateSnapshot;
        return TestBed.runInInjectionContext(() =>
            AuthGuard({} as ActivatedRouteSnapshot, state) as boolean
        );
    }

    it('should return true if user is authenticated', () => {
        authService.authenticated.mockReturnValue(true);
        expect(executeGuard()).toBe(true);
    });

    it('should navigate to root and return false if user is not authenticated', () => {
        authService.authenticated.mockReturnValue(false);
        expect(executeGuard()).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('lets a signed-in user reach a route it does not gate, rights are permissionGuard business', () => {
        authService.authenticated.mockReturnValue(true);

        expect(executeGuard(SETTINGS_URL)).toBe(true);
    });

    it('records no reason when the session is gone, because that is not a rights problem', () => {
        authService.authenticated.mockReturnValue(false);

        executeGuard(SETTINGS_URL);

        expect(noAccessReason.consume()).toBeNull();
    });

    it('records no reason when the user passes', () => {
        authService.authenticated.mockReturnValue(true);

        executeGuard(SETTINGS_URL);

        expect(noAccessReason.consume()).toBeNull();
    });
});
