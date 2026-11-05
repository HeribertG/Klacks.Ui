// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TokenRefreshInterceptor } from './token-refresh.interceptor';
import { AuthService } from './auth.service';
import { NavigationService } from '../services/navigation.service';
import { DraftRecoveryService } from '../services/draft-recovery.service';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';

const TEST_URL = '/api/backend/test';
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };
const SESSION_ENDPOINTS = ['Accounts/LoginUser', 'Accounts/RefreshToken', 'Accounts/Logout', 'OAuth2/callback'];
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe('TokenRefreshInterceptor', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;
    let authService: any;
    let navigationService: any;
    let draftRecoveryService: any;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                { provide: HTTP_INTERCEPTORS, useClass: TokenRefreshInterceptor, multi: true },
                {
                    provide: AuthService,
                    useValue: { refreshToken: vi.fn(), logOut: vi.fn(), authenticated: vi.fn().mockReturnValue(true) },
                },
                { provide: NavigationService, useValue: { navigateToRoot: vi.fn(), redirectToLogin: vi.fn() } },
                { provide: DraftRecoveryService, useValue: { capture: vi.fn() } },
            ],
        });

        httpClient = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService) as any;
        navigationService = TestBed.inject(NavigationService) as any;
        draftRecoveryService = TestBed.inject(DraftRecoveryService) as any;
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('refreshes once on a 401 and replays the request without an Authorization header', async () => {
        authService.refreshToken.mockResolvedValue(true);
        let responseData: any = null;

        httpClient.get(TEST_URL).subscribe({ next: (data) => (responseData = data) });

        httpMock.expectOne(TEST_URL).flush(null, UNAUTHORIZED);
        await tick();

        const retry = httpMock.expectOne(TEST_URL);
        expect(retry.request.headers.has('Authorization')).toBe(false);
        expect(authService.refreshToken).toHaveBeenCalledTimes(1);
        retry.flush({ data: 'test' });
        await tick();

        expect(responseData).toEqual({ data: 'test' });
    });

    it('keeps credentials and the CSRF header on the replayed request', async () => {
        authService.refreshToken.mockResolvedValue(true);

        httpClient
            .post(TEST_URL, null, {
                withCredentials: true,
                headers: new HttpHeaders({ [X_REQUESTED_WITH_HEADER]: X_REQUESTED_WITH_VALUE }),
            })
            .subscribe();

        httpMock.expectOne(TEST_URL).flush(null, UNAUTHORIZED);
        await tick();

        const retry = httpMock.expectOne(TEST_URL);
        expect(retry.request.withCredentials).toBe(true);
        expect(retry.request.headers.get(X_REQUESTED_WITH_HEADER)).toBe(X_REQUESTED_WITH_VALUE);
        retry.flush({});
    });

    it('logs out and redirects to login when the server rejects the refresh', async () => {
        authService.refreshToken.mockResolvedValue(false);
        let completed = false;

        httpClient.get(TEST_URL).subscribe({
            next: () => {
                throw new Error('Should not succeed when refresh token fails');
            },
            error: () => {
                throw new Error('Should complete without error');
            },
            complete: () => (completed = true),
        });

        httpMock.expectOne(TEST_URL).flush(null, UNAUTHORIZED);
        await tick(10);

        expect(draftRecoveryService.capture).toHaveBeenCalled();
        expect(authService.logOut).toHaveBeenCalled();
        expect(navigationService.redirectToLogin).toHaveBeenCalled();
        expect(completed).toBe(true);
    });

    it('keeps the session and fails the request with its 401 when the refresh fails transiently', async () => {
        authService.refreshToken.mockReturnValue(
            Promise.reject(new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }))
        );
        let failedStatus: number | undefined;

        httpClient.get(TEST_URL).subscribe({ error: (error: HttpErrorResponse) => (failedStatus = error.status) });

        httpMock.expectOne(TEST_URL).flush(null, UNAUTHORIZED);
        await tick(10);

        expect(failedStatus).toBe(401);
        expect(authService.logOut).not.toHaveBeenCalled();
        expect(navigationService.redirectToLogin).not.toHaveBeenCalled();
    });

    it('fails all parallel waiters without logging out when the refresh fails transiently', async () => {
        authService.refreshToken.mockReturnValue(Promise.reject(new HttpErrorResponse({ status: 0 })));
        const failures: number[] = [];

        httpClient.get(TEST_URL).subscribe({ error: (error: HttpErrorResponse) => failures.push(error.status) });
        httpClient.get(TEST_URL).subscribe({ error: (error: HttpErrorResponse) => failures.push(error.status) });

        httpMock.match(TEST_URL).forEach((r) => r.flush(null, UNAUTHORIZED));
        await tick(10);

        expect(authService.refreshToken).toHaveBeenCalledTimes(1);
        expect(failures).toEqual([401, 401]);
        expect(authService.logOut).not.toHaveBeenCalled();
    });

    it('releases all parallel waiting requests when the refresh is rejected (no spinner leak)', async () => {
        authService.refreshToken.mockResolvedValue(false);
        const completed: boolean[] = [];

        httpClient.get(TEST_URL).subscribe({ complete: () => completed.push(true) });
        httpClient.get(TEST_URL).subscribe({ complete: () => completed.push(true) });

        httpMock.match(TEST_URL).forEach((r) => r.flush(null, UNAUTHORIZED));
        await tick(10);

        expect(authService.refreshToken).toHaveBeenCalledTimes(1);
        expect(authService.logOut).toHaveBeenCalledTimes(1);
        expect(completed).toEqual([true, true]);
    });

    it('replays all parallel waiters with a single refresh on success', async () => {
        let resolveRefresh: (value: boolean) => void = () => undefined;
        authService.refreshToken.mockReturnValue(new Promise<boolean>((resolve) => (resolveRefresh = resolve)));
        const received: any[] = [];

        httpClient.get(TEST_URL).subscribe({ next: (d) => received.push(d) });
        httpClient.get(TEST_URL).subscribe({ next: (d) => received.push(d) });

        httpMock.match(TEST_URL).forEach((r) => r.flush(null, UNAUTHORIZED));
        resolveRefresh(true);
        await tick();

        const retries = httpMock.match(TEST_URL);
        expect(retries.length).toBe(2);
        expect(authService.refreshToken).toHaveBeenCalledTimes(1);
        retries.forEach((r) => r.flush({ ok: true }));
        await tick();

        expect(received).toEqual([{ ok: true }, { ok: true }]);
    });

    it('replays a request sent before the last successful refresh without refreshing again', async () => {
        const lateUrl = TEST_URL + '/late';
        authService.refreshToken.mockResolvedValue(true);

        httpClient.get(TEST_URL).subscribe();
        httpClient.get(lateUrl).subscribe();
        await tick(2);

        httpMock.expectOne(TEST_URL).flush(null, UNAUTHORIZED);
        await tick(2);
        httpMock.expectOne(TEST_URL).flush({});

        httpMock.expectOne(lateUrl).flush(null, UNAUTHORIZED);
        await tick();

        httpMock.expectOne(lateUrl).flush({});
        expect(authService.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('does not refresh again when a replayed request fails with 401', async () => {
        authService.refreshToken.mockResolvedValue(true);
        let erroredStatus = 0;

        httpClient.get(TEST_URL).subscribe({ error: (error: HttpErrorResponse) => (erroredStatus = error.status) });

        httpMock.expectOne(TEST_URL).flush(null, UNAUTHORIZED);
        await tick();
        httpMock.expectOne(TEST_URL).flush(null, UNAUTHORIZED);
        await tick();

        expect(authService.refreshToken).toHaveBeenCalledTimes(1);
        expect(erroredStatus).toBe(401);
    });

    for (const endpoint of SESSION_ENDPOINTS) {
        it('does not attempt a refresh for ' + endpoint, async () => {
            const url = '/api/backend/' + endpoint;
            let status = 0;

            httpClient.get(url).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
            httpMock.expectOne(url).flush(null, UNAUTHORIZED);
            await tick();

            expect(status).toBe(401);
            expect(authService.refreshToken).not.toHaveBeenCalled();
        });
    }

    it('does not attempt a refresh in a tab without a local session', async () => {
        authService.authenticated.mockReturnValue(false);
        let status = 0;

        httpClient.get(TEST_URL).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
        httpMock.expectOne(TEST_URL).flush(null, UNAUTHORIZED);
        await tick();

        expect(status).toBe(401);
        expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('does not attempt a refresh for a request outside the API', async () => {
        const url = 'https://tiles.example.test/1/2/3.png';
        let status = 0;

        httpClient.get(url).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
        httpMock.expectOne(url).flush(null, UNAUTHORIZED);
        await tick();

        expect(status).toBe(401);
        expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('does not attempt a refresh for a foreign host whose path contains /api/', async () => {
        const url = 'https://foreign.example.test/api/backend/test';
        let status = 0;

        httpClient.get(url).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
        httpMock.expectOne(url).flush(null, UNAUTHORIZED);
        await tick();

        expect(status).toBe(401);
        expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('passes through non-401 errors', async () => {
        let status = 0;

        httpClient.get(TEST_URL).subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
        httpMock.expectOne(TEST_URL).flush(null, { status: 500, statusText: 'Internal Server Error' });
        await tick();

        expect(status).toBe(500);
        expect(authService.refreshToken).not.toHaveBeenCalled();
    });
});
