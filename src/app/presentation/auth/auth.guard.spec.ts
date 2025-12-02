import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
    let authGuard: AuthGuard;
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
                AuthGuard,
                { provide: AuthService, useValue: authServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });

        authGuard = TestBed.inject(AuthGuard);
        authService = TestBed.inject(AuthService) as any;
        router = TestBed.inject(Router) as any;
    });

    it('should return true if user is authenticated and authorised', () => {
        authService.authenticated.mockReturnValue(true);
        authService.isAuthorised.mockReturnValue(true);
        const snapshot = { url: '/someurl' } as RouterStateSnapshot;

        expect(authGuard.canActivate({} as ActivatedRouteSnapshot, snapshot)).toBe(true);
    });

    it('should navigate to root and return false if user is not authenticated', () => {
        authService.authenticated.mockReturnValue(false);
        authService.isAuthorised.mockReturnValue(true);
        const snapshot = { url: '/someurl' } as RouterStateSnapshot;

        expect(authGuard.canActivate({} as ActivatedRouteSnapshot, snapshot)).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should navigate to root and return false if user is not authorised', () => {
        authService.authenticated.mockReturnValue(true);
        authService.isAuthorised.mockReturnValue(false);
        const snapshot = { url: '/someurl' } as RouterStateSnapshot;

        expect(authGuard.canActivate({} as ActivatedRouteSnapshot, snapshot)).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
});
