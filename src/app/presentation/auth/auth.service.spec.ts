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

    it('should remove token on logout', () => {
        // Setup a dummy token
        localStorage.setItem(StorageKeys.TOKEN, 'dummyToken');

        service.logOut();

        expect(localStorage.getItem(StorageKeys.TOKEN)).toBeNull();
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
        const dataDashboardService = TestBed.inject(DataDashboardService);

        dataDashboardService.getClientsOverviewData().subscribe();
        httpMock.expectOne('https://localhost:5001/api/backend/Dashboard/GroupTree').flush({ rootId: null, nodes: [] });

        service.logOut();

        dataDashboardService.getClientsOverviewData().subscribe();
        httpMock.expectOne('https://localhost:5001/api/backend/Dashboard/GroupTree').flush({ rootId: null, nodes: [] });
    });
});
