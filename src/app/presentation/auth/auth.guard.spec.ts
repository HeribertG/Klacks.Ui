// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
    let authService: any;
    let router: any;

    beforeEach(() => {
        const authServiceSpy = {
            authenticated: vi.fn(),
            isAuthorised: vi.fn()
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
    });

    function executeGuard(url = '/someurl'): boolean {
        const state = { url } as RouterStateSnapshot;
        return TestBed.runInInjectionContext(() =>
            AuthGuard({} as ActivatedRouteSnapshot, state) as boolean
        );
    }

    it('should return true if user is authenticated and authorised', () => {
        authService.authenticated.mockReturnValue(true);
        authService.isAuthorised.mockReturnValue(true);
        expect(executeGuard()).toBe(true);
    });

    it('should navigate to root and return false if user is not authenticated', () => {
        authService.authenticated.mockReturnValue(false);
        authService.isAuthorised.mockReturnValue(true);
        expect(executeGuard()).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should navigate to root and return false if user is not authorised', () => {
        authService.authenticated.mockReturnValue(true);
        authService.isAuthorised.mockReturnValue(false);
        expect(executeGuard()).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
});
