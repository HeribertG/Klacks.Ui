// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting, } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { MyToken } from 'src/app/domain/models/authentification-class';
import { ToastShowService } from '../toast/toast-show.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { EmailSignalRService } from 'src/app/infrastructure/signalr/email-signalr.service';
import { DataHarmonizerService } from 'src/app/infrastructure/api/harmonizer/data-harmonizer.service';
import { DataHolisticHarmonizerService } from 'src/app/infrastructure/api/holistic-harmonizer/data-holistic-harmonizer.service';
import { DraftRecoveryService } from 'src/app/presentation/services/draft-recovery.service';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let toastShowService: ToastShowService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                AuthService,
                ToastShowService,
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
        toastShowService = TestBed.inject(ToastShowService);
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should authenticate a user and store a token on login', async () => {
        const mockUser = {
            email: 'test@test.com',
            password: 'password',
        };

        const mockToken: MyToken = {
            token: 'token',
            subject: 'subject',
            username: 'username',
            id: 'id',
            expTime: new Date(),
            isAdmin: true,
            isAuthorised: true,
            version: '1.0',
            refreshToken: 'refreshToken',
            success: false,
            errorMessage: '',
            firstName: '',
            name: '',
        };

        const loginPromise = service.logIn(mockUser.email, mockUser.password);

        const req = httpMock.expectOne('https://localhost:5001/api/backend/Accounts/LoginUser');
        expect(req.request.method).toBe('POST');
        req.flush(mockToken);

        const result = await loginPromise;
        expect(result).toBe(true);
        expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual(mockToken.token);
    });

    const logoutUrl = 'https://localhost:5001/api/backend/Accounts/Logout';

    it('should remove token on logout', () => {
        // Setup a dummy token
        localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

        service.logOut();

        expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();

        const req = httpMock.expectOne(logoutUrl);
        expect(req.request.method).toBe('POST');
        req.flush(null);
    });

    it('should call the server-side logout endpoint before clearing local tokens', () => {
        localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

        service.logOut();

        httpMock.expectOne(logoutUrl).flush(null);
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

    it('should skip the server-side logout call when there is no local token', () => {
        service.logOut();

        httpMock.expectNone(logoutUrl);
    });

    function makeJwt(expSecondsFromNow: number): string {
        const payload = btoa(
            JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })
        );
        return `header.${payload}.signature`;
    }

    const refreshUrl = 'https://localhost:5001/api/backend/Accounts/RefreshToken';

    it('should not refresh at startup when no token is stored', async () => {
        await service.ensureFreshTokenAtStartup();
        httpMock.expectNone(refreshUrl);
    });

    it('should not refresh at startup when the access token is still valid', async () => {
        localStorage.setItem(StorageKeys.TOKEN, makeJwt(3600));
        localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'refreshToken');

        await service.ensureFreshTokenAtStartup();

        httpMock.expectNone(refreshUrl);
    });

    it('should not refresh at startup when the token is expired but no refresh token exists', async () => {
        localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));

        await service.ensureFreshTokenAtStartup();

        httpMock.expectNone(refreshUrl);
    });

    it('should clear the dead session at startup when the token is expired and no refresh token exists', async () => {
        localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));

        await service.ensureFreshTokenAtStartup();

        expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();
        httpMock.expectOne(logoutUrl).flush(null);
    });

    it('should clear the session at startup when the server rejects the refresh token as invalid', async () => {
        localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));
        localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'deadRefreshToken');

        const startupPromise = service.ensureFreshTokenAtStartup();

        httpMock.expectOne(refreshUrl).flush('Unauthorized', {
            status: 401,
            statusText: 'Unauthorized',
        });
        await startupPromise;

        expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();
        httpMock.expectOne(logoutUrl).flush(null);
    });

    it('should keep the session at startup when the refresh attempt fails for an unrelated reason (backend unreachable)', async () => {
        localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));
        localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'refreshToken');

        const startupPromise = service.ensureFreshTokenAtStartup();

        httpMock.expectOne(refreshUrl).flush('Bad Gateway', {
            status: 502,
            statusText: 'Bad Gateway',
        });
        await startupPromise;

        expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual(makeJwt(-60));
        httpMock.expectNone(logoutUrl);
    });

    it('should silently refresh an expired-but-renewable token at startup', async () => {
        localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));
        localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'refreshToken');

        const startupPromise = service.ensureFreshTokenAtStartup();

        const req = httpMock.expectOne(refreshUrl);
        expect(req.request.method).toBe('POST');
        req.flush({
            token: makeJwt(900),
            subject: 'subject',
            username: 'username',
            id: 'id',
            expTime: new Date(),
            isAdmin: true,
            isAuthorised: true,
            version: '1.0',
            refreshToken: 'rotatedRefreshToken',
        });

        await startupPromise;
        expect(localStorage.getItem(StorageKeys.TOKEN)).toEqual(makeJwt(900));
    });

    it('should refresh only once when startup refresh is requested concurrently', async () => {
        localStorage.setItem(StorageKeys.TOKEN, makeJwt(-60));
        localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'refreshToken');

        const first = service.ensureFreshTokenAtStartup();
        const second = service.ensureFreshTokenAtStartup();

        const req = httpMock.expectOne(refreshUrl);
        req.flush({
            token: makeJwt(900),
            subject: 'subject',
            username: 'username',
            id: 'id',
            expTime: new Date(),
            isAdmin: true,
            isAuthorised: true,
            version: '1.0',
            refreshToken: 'rotatedRefreshToken',
        });

        await Promise.all([first, second]);
        httpMock.expectNone(refreshUrl);
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

    beforeEach(() => {
        signalRMock.stopConnection.mockClear();
        draftRecoveryMock.clear.mockClear();
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
});
