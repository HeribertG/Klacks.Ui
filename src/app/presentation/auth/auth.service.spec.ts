// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { MyToken } from 'src/app/domain/models/my-token-class';
import { ToastShowService } from '../toast/toast-show.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import {
    SERVER_LOGOUT_WAIT_MS,
    X_REQUESTED_WITH_HEADER,
    X_REQUESTED_WITH_VALUE,
} from 'src/app/domain/constants/auth-request.constants';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { EmailSignalRService } from 'src/app/infrastructure/signalr/email-signalr.service';
import { DataHarmonizerService } from 'src/app/application/services/harmonizer/data-harmonizer.service';
import { DataHolisticHarmonizerService } from 'src/app/application/services/holistic-harmonizer/data-holistic-harmonizer.service';
import { DraftRecoveryService } from 'src/app/presentation/services/draft-recovery.service';
import { DataAutoWizardService } from 'src/app/application/services/auto-wizard/data-auto-wizard.service';
import { AutoWizardJobTrackerService } from 'src/app/presentation/workplace/schedule/services/auto-wizard-job-tracker.service';
import { AutoWizardSoftAlternativeService } from 'src/app/presentation/workplace/schedule/services/auto-wizard-soft-alternative.service';
import { CompanyClockService } from 'src/app/domain/services/settings/company-clock.service';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                AuthService,
                ToastShowService,
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: CompanyClockService, useValue: { loadIfAuthenticated: vi.fn().mockResolvedValue(undefined), reset: vi.fn() } },
            ],
        });
        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    function makeJwt(expSecondsFromNow: number): string {
        const payload = btoa(
            JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })
        );
        return `header.${payload}.signature`;
    }

    function isoIn(secondsFromNow: number): string {
        return new Date(Date.now() + secondsFromNow * 1000).toISOString();
    }

    function issuedToken(expSecondsFromNow = 900): MyToken {
        return {
            token: makeJwt(expSecondsFromNow),
            subject: 'subject',
            username: 'username',
            id: 'id',
            expTime: isoIn(expSecondsFromNow) as unknown as Date,
            isAdmin: true,
            isAuthorised: true,
            permissions: [ROLE_ADMIN],
            version: '1.0',
            success: true,
            errorMessage: '',
            firstName: '',
            name: '',
        };
    }

    function signIn(expSecondsFromNow: number, withRights = true): void {
        localStorage.setItem(StorageKeys.TOKEN_USERID, 'id');
        localStorage.setItem(StorageKeys.TOKEN_USERNAME, 'username');
        localStorage.setItem(StorageKeys.TOKEN_EXP, isoIn(expSecondsFromNow));
        if (withRights) {
            localStorage.setItem(StorageKeys.TOKEN_PERMISSIONS, JSON.stringify([ROLE_ADMIN]));
        }
    }

    const loginUrl = 'https://localhost:5001/api/backend/Accounts/LoginUser';
    const logoutUrl = 'https://localhost:5001/api/backend/Accounts/Logout';
    const refreshUrl = 'https://localhost:5001/api/backend/Accounts/RefreshToken';
    const unauthorized = { status: 401, statusText: 'Unauthorized' };

    function expectCredentialed(req: TestRequest): void {
        expect(req.request.withCredentials).toBe(true);
        expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBe(X_REQUESTED_WITH_VALUE);
    }

    it('should store the profile and expiry on login but never an access or refresh token', async () => {
        localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

        const loginPromise = service.logIn('test@test.com', 'password');

        const req = httpMock.expectOne(loginUrl);
        expect(req.request.method).toBe('POST');
        expectCredentialed(req);
        req.flush({ ...issuedToken(), refreshToken: 'must-not-be-stored' });

        expect(await loginPromise).toBe(true);
        expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBeNull();
        expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
        expect(localStorage.getItem(StorageKeys.TOKEN_USERID)).toBe('id');
        expect(localStorage.getItem(StorageKeys.TOKEN_EXP)).not.toBeNull();
        expect(service.authenticated()).toBe(true);
    });

    describe('session marker', () => {
        it('should count a stored profile as signed in', () => {
            signIn(900);

            expect(service.authenticated()).toBe(true);
        });

        it('should count a session that only an older build stored (JWT_TOKEN, no profile) as signed in', () => {
            localStorage.setItem(StorageKeys.LEGACY_ACCESS_TOKEN, makeJwt(900));

            expect(service.authenticated()).toBe(true);
        });

        it('should not count an empty storage as signed in', () => {
            expect(service.authenticated()).toBe(false);
        });
    });

    describe('logout', () => {
        it('should call the server logout with credentials and clear the local session', () => {
            signIn(900);

            service.logOut();

            expect(service.authenticated()).toBe(false);
            expect(localStorage.getItem(StorageKeys.TOKEN_EXP)).toBeNull();
            const req = httpMock.expectOne(logoutUrl);
            expect(req.request.method).toBe('POST');
            expectCredentialed(req);
            req.flush(null);
        });

        it('should still clear the local session when the server-side logout call fails', () => {
            signIn(900);

            service.logOut();

            httpMock.expectOne(logoutUrl).flush('Unauthorized', unauthorized);

            expect(service.authenticated()).toBe(false);
        });

        it('should call the server logout also without a local session, so cookies a lost profile left are cleared', () => {
            service.logOut();

            expectCredentialed(httpMock.expectOne(logoutUrl));
        });

        it('should repeat a server logout that failed transiently once and then give up', () => {
            signIn(900);

            service.logOut();

            httpMock.expectOne(logoutUrl).flush(null, { status: 503, statusText: 'Service Unavailable' });
            httpMock.expectOne(logoutUrl).flush(null, { status: 503, statusText: 'Service Unavailable' });
            httpMock.expectNone(logoutUrl);
            expect(service.authenticated()).toBe(false);
        });

        it('should send one server logout when logout paths run back to back', () => {
            signIn(900);

            service.logOut();
            service.logOut();

            httpMock.expectOne(logoutUrl).flush(null);
        });

        it('should send one server logout on entering the login page without a local session and not block it', () => {
            service.checkIfTokenIsValid();

            expect(service.authenticated()).toBe(false);
            const req = httpMock.expectOne(logoutUrl);
            expectCredentialed(req);
            httpMock.expectNone(refreshUrl);
            req.flush(null);
        });

        it('should wait for a server logout in flight before signing in, so it cannot clear the new cookies', async () => {
            service.checkIfTokenIsValid();
            const logoutReq = httpMock.expectOne(logoutUrl);

            const loginPromise = service.logIn('test@test.com', 'password');
            await Promise.resolve();
            httpMock.expectNone(loginUrl);

            logoutReq.flush(null);
            await vi.waitFor(() => httpMock.expectOne(loginUrl).flush(issuedToken()));

            expect(await loginPromise).toBe(true);
        });

        it('should not let a hanging server logout block the sign-in beyond the wait limit', async () => {
            vi.useFakeTimers();
            service.checkIfTokenIsValid();
            httpMock.expectOne(logoutUrl);

            const loginPromise = service.logIn('test@test.com', 'password');
            await vi.advanceTimersByTimeAsync(SERVER_LOGOUT_WAIT_MS);
            httpMock.expectOne(loginUrl).flush(issuedToken());

            expect(await loginPromise).toBe(true);
            vi.useRealTimers();
        });

        it('should drop the keys an older build left, also a still-valid access token, on logout', () => {
            signIn(900);
            localStorage.setItem(StorageKeys.LEGACY_ACCESS_TOKEN, makeJwt(900));
            localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

            service.logOut();
            httpMock.expectOne(logoutUrl).flush(null);

            expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBeNull();
            expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
        });

        it('should finish the server logout before the SSO sign-out clears the session', async () => {
            signIn(900);

            const logoutPromise = service.logOutWithSso();
            const req = httpMock.expectOne(logoutUrl);
            expectCredentialed(req);
            expect(service.authenticated()).toBe(true);

            req.flush(null);
            await logoutPromise;

            expect(service.authenticated()).toBe(false);
        });

        it('should not let a hanging server logout block the SSO sign-out beyond the wait limit', async () => {
            vi.useFakeTimers();
            signIn(900);

            const logoutPromise = service.logOutWithSso();
            httpMock.expectOne(logoutUrl);
            await vi.advanceTimersByTimeAsync(SERVER_LOGOUT_WAIT_MS);
            await logoutPromise;

            expect(service.authenticated()).toBe(false);
            vi.useRealTimers();
        });
    });

    describe('startup', () => {
        it('should not refresh at startup without a local session, and drop leftover legacy keys', async () => {
            localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

            await service.ensureFreshTokenAtStartup();

            httpMock.expectNone(refreshUrl);
            expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
        });

        it('should not refresh at startup when the stored expiry is ahead and nothing needs repair', async () => {
            signIn(3600);

            await service.ensureFreshTokenAtStartup();

            httpMock.expectNone(refreshUrl);
        });

        it('should refresh a still-valid session that has no stored rights list, through the cookie', async () => {
            signIn(3600, false);

            const startupPromise = service.ensureFreshTokenAtStartup();

            const req = httpMock.expectOne(refreshUrl);
            expectCredentialed(req);
            expect(req.request.body).toEqual({});
            req.flush(issuedToken());
            await startupPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN_PERMISSIONS)).toBe(JSON.stringify([ROLE_ADMIN]));
        });

        it('should renew an expired session through the cookie and record the new expiry', async () => {
            signIn(-60);

            const startupPromise = service.ensureFreshTokenAtStartup();

            const req = httpMock.expectOne(refreshUrl);
            expectCredentialed(req);
            expect(req.request.body).toEqual({});
            req.flush(issuedToken(900));
            await startupPromise;

            expect(Date.parse(localStorage.getItem(StorageKeys.TOKEN_EXP)!)).toBeGreaterThan(Date.now());
            expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBeNull();
            httpMock.expectNone(logoutUrl);
        });

        it('should log out at startup when the server rejects the refresh', async () => {
            signIn(-60);

            const startupPromise = service.ensureFreshTokenAtStartup();

            httpMock.expectOne(refreshUrl).flush('Unauthorized', unauthorized);
            await startupPromise;

            expect(service.authenticated()).toBe(false);
            expectCredentialed(httpMock.expectOne(logoutUrl));
        });

        it('should keep the session at startup when the refresh attempt fails for an unrelated reason (backend unreachable)', async () => {
            signIn(-60);

            const startupPromise = service.ensureFreshTokenAtStartup();

            httpMock.expectOne(refreshUrl).flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
            await startupPromise;

            expect(service.authenticated()).toBe(true);
            httpMock.expectNone(logoutUrl);
        });

        it('should refresh only once when startup refresh is requested concurrently', async () => {
            signIn(-60);

            const first = service.ensureFreshTokenAtStartup();
            const second = service.ensureFreshTokenAtStartup();

            httpMock.expectOne(refreshUrl).flush(issuedToken());

            await Promise.all([first, second]);
            httpMock.expectNone(refreshUrl);
        });
    });

    describe('sessions an older build stored', () => {
        it('should renew a session that only holds a still-valid JWT_TOKEN, keep that token for older tabs, and store the profile', async () => {
            const legacyToken = makeJwt(3600);
            localStorage.setItem(StorageKeys.LEGACY_ACCESS_TOKEN, legacyToken);
            localStorage.setItem(StorageKeys.TOKEN_EXP, isoIn(3600));
            localStorage.setItem(StorageKeys.TOKEN_PERMISSIONS, JSON.stringify([ROLE_ADMIN]));

            const startupPromise = service.ensureFreshTokenAtStartup();

            const req = httpMock.expectOne(refreshUrl);
            expectCredentialed(req);
            req.flush(issuedToken());
            await startupPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN_USERID)).toBe('id');
            expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBe(legacyToken);
            httpMock.expectNone(logoutUrl);
        });

        it('should drop an expired JWT_TOKEN at startup', async () => {
            signIn(-60);
            localStorage.setItem(StorageKeys.LEGACY_ACCESS_TOKEN, makeJwt(-60));

            const startupPromise = service.ensureFreshTokenAtStartup();
            expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBeNull();

            httpMock.expectOne(refreshUrl).flush(issuedToken());
            await startupPromise;
        });

        it('should move a refresh token from localStorage into the cookie with one body refresh and drop it', async () => {
            signIn(3600);
            localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

            const startupPromise = service.ensureFreshTokenAtStartup();

            const req = httpMock.expectOne(refreshUrl);
            expectCredentialed(req);
            expect(req.request.body).toEqual({ refreshToken: 'legacy' });
            req.flush(issuedToken());
            await startupPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
            httpMock.expectNone(refreshUrl);
        });

        it('should log out when the server rejects the stored refresh token', async () => {
            signIn(-60);
            localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'dead');

            const startupPromise = service.ensureFreshTokenAtStartup();

            httpMock
                .expectOne((r) => r.url === refreshUrl && r.body?.refreshToken === 'dead')
                .flush('Unauthorized', unauthorized);
            await startupPromise;

            httpMock.expectNone(refreshUrl);
            expect(service.authenticated()).toBe(false);
            expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
            httpMock.expectOne(logoutUrl).flush(null);
        });
    });

    describe('refreshToken()', () => {
        it('should not refresh a tab that has no local session, so a leftover cookie never revives it', async () => {
            const result = await service.refreshToken();

            expect(result).toBe(false);
            httpMock.expectNone(refreshUrl);
        });

        it('should record the renewed expiry and report success without storing a token', async () => {
            signIn(-60);

            const resultPromise = service.refreshToken();
            httpMock.expectOne(refreshUrl).flush(issuedToken(900));

            expect(await resultPromise).toBe(true);
            expect(Date.parse(localStorage.getItem(StorageKeys.TOKEN_EXP)!)).toBeGreaterThan(Date.now());
            expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBeNull();
        });

        it('should report failure when the server rejects the refresh', async () => {
            signIn(-60);

            const resultPromise = service.refreshToken();
            httpMock.expectOne(refreshUrl).flush('Unauthorized', unauthorized);

            expect(await resultPromise).toBe(false);
        });

        it.each([
            [0, 'Unknown Error'],
            [503, 'Service Unavailable'],
            [429, 'Too Many Requests'],
        ])('should reject instead of reporting failure on a transient error (%s) and keep the session', async (status, statusText) => {
            signIn(-60);

            const resultPromise = service.refreshToken();
            httpMock.expectOne(refreshUrl).flush(null, { status, statusText });

            await expect(resultPromise).rejects.toMatchObject({ status });
            expect(service.authenticated()).toBe(true);
            httpMock.expectNone(logoutUrl);
        });
    });

    it('should invalidate the cached group tree on logout so the next user gets fresh scope-checked data', () => {
        signIn(900);
        const dataDashboardService = TestBed.inject(DataDashboardService);

        dataDashboardService.getClientsOverviewData().subscribe();
        httpMock.expectOne('https://localhost:5001/api/backend/Dashboard/GroupTree').flush({ rootId: null, nodes: [] });

        service.logOut();
        httpMock.expectOne(logoutUrl).flush(null);

        dataDashboardService.getClientsOverviewData().subscribe();
        httpMock.expectOne('https://localhost:5001/api/backend/Dashboard/GroupTree').flush({ rootId: null, nodes: [] });
    });

});

describe('AuthService logout session cleanup', () => {
    const logoutUrl = 'https://localhost:5001/api/backend/Accounts/Logout';
    let service: AuthService;
    let httpMock: HttpTestingController;
    const signalRMock = { stopConnection: vi.fn().mockResolvedValue(undefined) };
    const draftRecoveryMock = { clear: vi.fn().mockResolvedValue(true) };
    const companyClockMock = { loadIfAuthenticated: vi.fn().mockResolvedValue(undefined), reset: vi.fn() };
    const autoWizardMock = { stopConnection: vi.fn().mockResolvedValue(undefined) };
    const autoWizardTrackerMock = { reset: vi.fn() };
    const softAlternativeMock = { reset: vi.fn() };

    beforeEach(() => {
        signalRMock.stopConnection.mockClear();
        draftRecoveryMock.clear.mockClear();
        companyClockMock.reset.mockClear();
        autoWizardMock.stopConnection.mockClear();
        autoWizardTrackerMock.reset.mockClear();
        softAlternativeMock.reset.mockClear();
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                AuthService,
                ToastShowService,
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: SignalRService, useValue: signalRMock },
                { provide: AssistantSignalRService, useValue: { stopConnection: vi.fn().mockResolvedValue(undefined) } },
                { provide: EmailSignalRService, useValue: { stopConnection: vi.fn().mockResolvedValue(undefined) } },
                { provide: DataHarmonizerService, useValue: { stopConnection: vi.fn().mockResolvedValue(undefined) } },
                { provide: DataHolisticHarmonizerService, useValue: { stopConnection: vi.fn().mockResolvedValue(undefined) } },
                { provide: DraftRecoveryService, useValue: draftRecoveryMock },
                { provide: CompanyClockService, useValue: companyClockMock },
                { provide: DataAutoWizardService, useValue: autoWizardMock },
                { provide: AutoWizardJobTrackerService, useValue: autoWizardTrackerMock },
                { provide: AutoWizardSoftAlternativeService, useValue: softAlternativeMock },
            ],
        });
        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('should stop the realtime connection and clear the session draft and instance id on logout', () => {
        localStorage.setItem(StorageKeys.TOKEN_USERID, 'user-1');
        sessionStorage.setItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID, 'instance-123');

        service.logOut();

        expect(signalRMock.stopConnection).toHaveBeenCalled();
        expect(draftRecoveryMock.clear).toHaveBeenCalled();
        expect(
            sessionStorage.getItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID)
        ).toBeNull();

        httpMock.expectOne(logoutUrl).flush(null);
    });

    it('should forget the AutoWizard run of the previous user on logout', () => {
        localStorage.setItem(StorageKeys.TOKEN_USERID, 'user-1');
        sessionStorage.setItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB, '{"jobId":"job-1"}');
        sessionStorage.setItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO, '[]');

        service.logOut();

        expect(autoWizardMock.stopConnection).toHaveBeenCalled();
        expect(autoWizardTrackerMock.reset).toHaveBeenCalledTimes(1);
        expect(softAlternativeMock.reset).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB)).toBeNull();
        expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO)).toBeNull();
        httpMock.expectOne(logoutUrl).flush(null);
    });

    it('should reset the company clock on logout', () => {
        localStorage.setItem(StorageKeys.TOKEN_USERID, 'user-1');

        service.logOut();

        expect(companyClockMock.reset).toHaveBeenCalledTimes(1);
        httpMock.expectOne(logoutUrl).flush(null);
    });

    it('should reset the company clock on a logout without an SSO provider', async () => {
        const logoutPromise = service.logOutWithSso();
        httpMock.expectOne(logoutUrl).flush(null);
        await logoutPromise;

        expect(companyClockMock.reset).toHaveBeenCalledTimes(1);
    });
});
