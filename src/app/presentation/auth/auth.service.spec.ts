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

    function issuedToken(jwt: string): MyToken {
        return {
            token: jwt,
            subject: 'subject',
            username: 'username',
            id: 'id',
            expTime: new Date(),
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

    const loginUrl = 'https://localhost:5001/api/backend/Accounts/LoginUser';
    const logoutUrl = 'https://localhost:5001/api/backend/Accounts/Logout';
    const refreshUrl = 'https://localhost:5001/api/backend/Accounts/RefreshToken';

    function expectCredentialed(req: TestRequest): void {
        expect(req.request.withCredentials).toBe(true);
        expect(req.request.headers.get(X_REQUESTED_WITH_HEADER)).toBe(X_REQUESTED_WITH_VALUE);
    }

    it('should authenticate a user, store the access token and never store a refresh token on login', async () => {
        localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

        const loginPromise = service.logIn('test@test.com', 'password');

        const req = httpMock.expectOne(loginUrl);
        expect(req.request.method).toBe('POST');
        expectCredentialed(req);
        req.flush({ ...issuedToken('token'), refreshToken: 'must-not-be-stored' });

        const result = await loginPromise;
        expect(result).toBe(true);
        expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual('token');
        expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
    });

    describe('logout', () => {
        it('should call the server logout with credentials and clear the local session', () => {
            localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

            service.logOut();

            expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();
            const req = httpMock.expectOne(logoutUrl);
            expect(req.request.method).toBe('POST');
            expectCredentialed(req);
            req.flush(null);
        });

        it('should still clear local tokens when the server-side logout call fails', () => {
            localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

            service.logOut();

            httpMock.expectOne(logoutUrl).flush('Unauthorized', {
                status: 401,
                statusText: 'Unauthorized',
            });

            expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();
        });

        it('should skip the server-side logout call when there is no local session', () => {
            service.logOut();

            httpMock.expectNone(logoutUrl);
        });

        it('should drop a legacy refresh token on logout', () => {
            localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');
            localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

            service.logOut();
            httpMock.expectOne(logoutUrl).flush(null);

            expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
        });

        it('should finish the server logout before the SSO sign-out clears the session', async () => {
            localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

            const logoutPromise = service.logOutWithSso();
            const req = httpMock.expectOne(logoutUrl);
            expectCredentialed(req);
            expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual('dummyToken');

            req.flush(null);
            await logoutPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();
        });

        it('should not let a hanging server logout block the SSO sign-out beyond the wait limit', async () => {
            vi.useFakeTimers();
            localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

            const logoutPromise = service.logOutWithSso();
            httpMock.expectOne(logoutUrl);
            await vi.advanceTimersByTimeAsync(SERVER_LOGOUT_WAIT_MS);
            await logoutPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();
            vi.useRealTimers();
        });
    });

    describe('startup', () => {
        it('should not refresh at startup when no token is stored, and drop a leftover legacy refresh token', async () => {
            localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

            await service.ensureFreshTokenAtStartup();

            httpMock.expectNone(refreshUrl);
            expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
        });

        it('should not refresh at startup when the access token is still valid and nothing needs repair', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(3600));
            localStorage.setItem(StorageKeys.TOKEN_PERMISSIONS, JSON.stringify([ROLE_ADMIN]));

            await service.ensureFreshTokenAtStartup();

            httpMock.expectNone(refreshUrl);
        });

        it('should refresh a still-valid session that has no stored rights list, through the cookie', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(3600));

            const startupPromise = service.ensureFreshTokenAtStartup();

            const req = httpMock.expectOne(refreshUrl);
            expectCredentialed(req);
            expect(req.request.body).toEqual({});
            req.flush(issuedToken(makeJwt(3600)));
            await startupPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN_PERMISSIONS)).toBe(
                JSON.stringify([ROLE_ADMIN])
            );
        });

        it('should keep a still-valid session signed in when the rights-list repair fails', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(3600));

            const startupPromise = service.ensureFreshTokenAtStartup();

            httpMock.expectOne(refreshUrl).flush('Unauthorized', {
                status: 401,
                statusText: 'Unauthorized',
            });
            await startupPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN)).not.toBeNull();
            httpMock.expectNone(logoutUrl);
        });

        it('should renew an expired session through the cookie even though no refresh token is stored', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));

            const startupPromise = service.ensureFreshTokenAtStartup();

            const req = httpMock.expectOne(refreshUrl);
            expectCredentialed(req);
            expect(req.request.body).toEqual({});
            req.flush(issuedToken(makeJwt(900)));
            await startupPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual(makeJwt(900));
            httpMock.expectNone(logoutUrl);
        });

        it('should log out at startup when the server rejects the refresh', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));

            const startupPromise = service.ensureFreshTokenAtStartup();

            httpMock.expectOne(refreshUrl).flush('Unauthorized', {
                status: 401,
                statusText: 'Unauthorized',
            });
            await startupPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();
            expectCredentialed(httpMock.expectOne(logoutUrl));
        });

        it('should keep the session at startup when the refresh attempt fails for an unrelated reason (backend unreachable)', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));

            const startupPromise = service.ensureFreshTokenAtStartup();

            httpMock.expectOne(refreshUrl).flush('Bad Gateway', {
                status: 502,
                statusText: 'Bad Gateway',
            });
            await startupPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual(makeJwt(-60));
            httpMock.expectNone(logoutUrl);
        });

        it('should refresh only once when startup refresh is requested concurrently', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));

            const first = service.ensureFreshTokenAtStartup();
            const second = service.ensureFreshTokenAtStartup();

            httpMock.expectOne(refreshUrl).flush(issuedToken(makeJwt(900)));

            await Promise.all([first, second]);
            httpMock.expectNone(refreshUrl);
        });
    });

    describe('migration of a refresh token left in localStorage by an older build', () => {
        it('should move a still-valid session into the cookie with one refresh and drop the stored refresh token', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(3600));
            localStorage.setItem(StorageKeys.TOKEN_PERMISSIONS, JSON.stringify([ROLE_ADMIN]));
            localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

            const startupPromise = service.ensureFreshTokenAtStartup();

            const req = httpMock.expectOne(refreshUrl);
            expectCredentialed(req);
            expect(req.request.body).toEqual({ refreshToken: 'legacy' });
            req.flush(issuedToken(makeJwt(900)));
            await startupPromise;

            expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
            expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual(makeJwt(900));
            httpMock.expectNone(refreshUrl);
        });

        it('should migrate and backfill the rights list with a single refresh', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(3600));
            localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

            const startupPromise = service.ensureFreshTokenAtStartup();

            httpMock.expectOne(refreshUrl).flush(issuedToken(makeJwt(900)));
            await startupPromise;

            httpMock.expectNone(refreshUrl);
            expect(localStorage.getItem(StorageKeys.TOKEN_PERMISSIONS)).toBe(JSON.stringify([ROLE_ADMIN]));
        });

        it('should log out when the server rejects the stored refresh token of an expired session', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));
            localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'dead');

            const startupPromise = service.ensureFreshTokenAtStartup();

            httpMock
                .expectOne((r) => r.url === refreshUrl && r.body?.refreshToken === 'dead')
                .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
            await startupPromise;

            httpMock.expectNone(refreshUrl);
            expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();
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

        it('should store the renewed access token and report success', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));

            const resultPromise = service.refreshToken();
            httpMock.expectOne(refreshUrl).flush(issuedToken(makeJwt(900)));

            expect(await resultPromise).toBe(true);
            expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual(makeJwt(900));
        });

        it('should report failure when the server rejects the refresh', async () => {
            localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));

            const resultPromise = service.refreshToken();
            httpMock.expectOne(refreshUrl).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

            expect(await resultPromise).toBe(false);
        });

        it.each([
            [0, 'Unknown Error'],
            [503, 'Service Unavailable'],
            [429, 'Too Many Requests'],
        ])('should reject instead of reporting failure on a transient error (%s) and keep the session', async (status, statusText) => {
            const token = makeJwt(-60);
            localStorage.setItem(StorageKeys.TOKEN, token);

            const resultPromise = service.refreshToken();
            httpMock.expectOne(refreshUrl).flush(null, { status, statusText });

            await expect(resultPromise).rejects.toMatchObject({ status });
            expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual(token);
            httpMock.expectNone(logoutUrl);
        });
    });

    it('should invalidate the cached group tree on logout so the next user gets fresh scope-checked data', () => {
        localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');
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

    beforeEach(() => {
        signalRMock.stopConnection.mockClear();
        draftRecoveryMock.clear.mockClear();
        companyClockMock.reset.mockClear();
        autoWizardMock.stopConnection.mockClear();
        autoWizardTrackerMock.reset.mockClear();
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
        localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');
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
        localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');
        sessionStorage.setItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB, '{"jobId":"job-1"}');
        sessionStorage.setItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO, '[]');

        service.logOut();

        expect(autoWizardMock.stopConnection).toHaveBeenCalled();
        expect(autoWizardTrackerMock.reset).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_ACTIVE_JOB)).toBeNull();
        expect(sessionStorage.getItem(StorageKeys.AUTO_WIZARD_PENDING_SCENARIO)).toBeNull();
        httpMock.expectOne(logoutUrl).flush(null);
    });

    it('should reset the company clock on logout', () => {
        localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

        service.logOut();

        expect(companyClockMock.reset).toHaveBeenCalledTimes(1);
        httpMock.expectOne(logoutUrl).flush(null);
    });

    it('should reset the company clock on a logout without an SSO provider', async () => {
        await service.logOutWithSso();

        expect(companyClockMock.reset).toHaveBeenCalledTimes(1);
    });
});
