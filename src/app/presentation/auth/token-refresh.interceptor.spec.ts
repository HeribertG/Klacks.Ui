// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse, } from '@angular/common/http';
import { TokenRefreshInterceptor } from './token-refresh.interceptor';
import { AuthService } from './auth.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { NavigationService } from '../services/navigation.service';
import { DraftRecoveryService } from '../services/draft-recovery.service';

describe('TokenRefreshInterceptor', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;
    let authService: any;
    let localStorageService: any;
    let navigationService: any;
    let draftRecoveryService: any;

    beforeEach(() => {
        const authServiceSpy = {
            refreshToken: vi.fn(),
            logOut: vi.fn()
        };
        const localStorageServiceSpy = {
            get: vi.fn()
        };
        const navigationServiceSpy = {
            navigateToRoot: vi.fn(),
            redirectToLogin: vi.fn()
        };
        const draftRecoveryServiceSpy = {
            capture: vi.fn()
        };

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: TokenRefreshInterceptor,
                    multi: true,
                },
                { provide: AuthService, useValue: authServiceSpy },
                { provide: LocalStorageService, useValue: localStorageServiceSpy },
                { provide: NavigationService, useValue: navigationServiceSpy },
                { provide: DraftRecoveryService, useValue: draftRecoveryServiceSpy },
            ],
        });

        httpClient = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService) as any;
        localStorageService = TestBed.inject(LocalStorageService) as any;
        navigationService = TestBed.inject(NavigationService) as any;
        draftRecoveryService = TestBed.inject(DraftRecoveryService) as any;
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(true).toBeTruthy();
    });

    it('should intercept 401 error and attempt token refresh', async () => {
        const testUrl = '/api/test';
        const testData = { data: 'test' };

        localStorageService.get.mockReturnValue('valid-token');
        let resolveRefresh: (value: boolean) => void;
        const refreshPromise = new Promise<boolean>(resolve => {
            resolveRefresh = resolve;
        });
        authService.refreshToken.mockReturnValue(refreshPromise);

        let responseData: any = null;
        httpClient
            .get(testUrl, {
            headers: { Authorization: 'Bearer old-token' },
        })
            .subscribe({
            next: (data) => {
                responseData = data;
            },
            error: () => {
                throw new Error('Should not error after successful token refresh');
            },
        });

        const req = httpMock.expectOne(testUrl);
        expect(req.request.headers.has('Authorization')).toBe(true);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });

        resolveRefresh!(true);
        await refreshPromise;
        await new Promise(resolve => setTimeout(resolve, 0));

        const retryReq = httpMock.expectOne(testUrl);
        expect(authService.refreshToken).toHaveBeenCalled();
        retryReq.flush(testData);

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(responseData).toEqual(testData);
    });

    it('should logout and navigate to root when refresh token fails', async () => {
        const testUrl = '/api/test';
        let completed = false;

        localStorageService.get.mockReturnValue('valid-token');
        authService.refreshToken.mockReturnValue(Promise.resolve(false));

        httpClient
            .get(testUrl, {
            headers: { Authorization: 'Bearer old-token' },
        })
            .subscribe({
            next: () => {
                throw new Error('Should not succeed when refresh token fails');
            },
            error: () => {
                throw new Error('Should complete without error');
            },
            complete: () => {
                completed = true;
            },
        });

        const req = httpMock.expectOne(testUrl);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(authService.refreshToken).toHaveBeenCalled();
        expect(draftRecoveryService.capture).toHaveBeenCalled();
        expect(authService.logOut).toHaveBeenCalled();
        expect(navigationService.redirectToLogin).toHaveBeenCalled();
        expect(completed).toBe(true);
    });

    it('should logout and navigate to root when refresh token throws error', async () => {
        const testUrl = '/api/test';
        let completed = false;

        localStorageService.get.mockReturnValue('valid-token');
        authService.refreshToken.mockReturnValue(Promise.reject(new Error('Refresh failed')));

        httpClient
            .get(testUrl, {
            headers: { Authorization: 'Bearer old-token' },
        })
            .subscribe({
            next: () => {
                throw new Error('Should not succeed when refresh token throws error');
            },
            error: () => {
                throw new Error('Should complete without error');
            },
            complete: () => {
                completed = true;
            },
        });

        const req = httpMock.expectOne(testUrl);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(authService.refreshToken).toHaveBeenCalled();
        expect(draftRecoveryService.capture).toHaveBeenCalled();
        expect(authService.logOut).toHaveBeenCalled();
        expect(navigationService.redirectToLogin).toHaveBeenCalled();
        expect(completed).toBe(true);
    });

    it('should not attempt refresh for LoginUser endpoint', async () => {
        const testUrl = '/api/LoginUser';

        httpClient.get(testUrl).subscribe({
            next: () => {
                throw new Error('Should error without refresh');
            },
            error: (error: HttpErrorResponse) => {
                expect(error.status).toBe(401);
                expect(authService.refreshToken).not.toHaveBeenCalled();
            },
        });

        const req = httpMock.expectOne(testUrl);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    it('should not attempt refresh for RefreshToken endpoint', async () => {
        const testUrl = '/api/RefreshToken';

        httpClient.get(testUrl).subscribe({
            next: () => {
                throw new Error('Should error without refresh');
            },
            error: (error: HttpErrorResponse) => {
                expect(error.status).toBe(401);
                expect(authService.refreshToken).not.toHaveBeenCalled();
            },
        });

        const req = httpMock.expectOne(testUrl);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    it('should not attempt refresh when no Authorization header present', async () => {
        const testUrl = '/api/test';

        httpClient.get(testUrl).subscribe({
            next: () => {
                throw new Error('Should error without refresh');
            },
            error: (error: HttpErrorResponse) => {
                expect(error.status).toBe(401);
                expect(authService.refreshToken).not.toHaveBeenCalled();
            },
        });

        const req = httpMock.expectOne(testUrl);
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    it('should pass through non-401 errors', async () => {
        const testUrl = '/api/test';

        httpClient.get(testUrl).subscribe({
            next: () => {
                throw new Error('Should error');
            },
            error: (error: HttpErrorResponse) => {
                expect(error.status).toBe(500);
                expect(authService.refreshToken).not.toHaveBeenCalled();
            },
        });

        const req = httpMock.expectOne(testUrl);
        req.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });
});
