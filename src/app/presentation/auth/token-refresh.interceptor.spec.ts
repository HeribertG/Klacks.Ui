import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpErrorResponse,
  HttpRequest,
} from '@angular/common/http';
import { TokenRefreshInterceptor } from './token-refresh.interceptor';
import { AuthService } from './auth.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { NavigationService } from '../services/navigation.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

describe('TokenRefreshInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;
  let navigationService: jasmine.SpyObj<NavigationService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'refreshToken',
      'logOut',
    ]);
    const localStorageServiceSpy = jasmine.createSpyObj('LocalStorageService', [
      'get',
    ]);
    const navigationServiceSpy = jasmine.createSpyObj('NavigationService', [
      'navigateToRoot',
    ]);

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
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    localStorageService = TestBed.inject(
      LocalStorageService
    ) as jasmine.SpyObj<LocalStorageService>;
    navigationService = TestBed.inject(
      NavigationService
    ) as jasmine.SpyObj<NavigationService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(true).toBeTruthy();
  });

  it('should intercept 401 error and attempt token refresh', fakeAsync(() => {
    const testUrl = '/api/test';
    const testData = { data: 'test' };
    let responseReceived = false;

    localStorageService.get.and.returnValue('valid-token');
    authService.refreshToken.and.returnValue(Promise.resolve(true));

    httpClient
      .get(testUrl, {
        headers: { Authorization: 'Bearer old-token' },
      })
      .subscribe({
        next: (data) => {
          expect(data).toEqual(testData);
          responseReceived = true;
        },
        error: () => {
          fail('Should not error after successful token refresh');
        },
      });

    const req = httpMock.expectOne(testUrl);
    expect(req.request.headers.has('Authorization')).toBe(true);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    tick();

    const retryReq = httpMock.expectOne(testUrl);
    expect(authService.refreshToken).toHaveBeenCalled();
    retryReq.flush(testData);

    tick();
    expect(responseReceived).toBe(true);
  }));

  it('should logout and navigate to root when refresh token fails', fakeAsync(() => {
    const testUrl = '/api/test';
    let completed = false;

    localStorageService.get.and.returnValue('valid-token');
    authService.refreshToken.and.returnValue(Promise.resolve(false));

    httpClient
      .get(testUrl, {
        headers: { Authorization: 'Bearer old-token' },
      })
      .subscribe({
        next: () => {
          fail('Should not succeed when refresh token fails');
        },
        error: () => {
          fail('Should complete without error');
        },
        complete: () => {
          completed = true;
        },
      });

    const req = httpMock.expectOne(testUrl);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    tick();

    expect(authService.refreshToken).toHaveBeenCalled();
    expect(authService.logOut).toHaveBeenCalled();
    expect(navigationService.navigateToRoot).toHaveBeenCalled();
    expect(completed).toBe(true);
  }));

  it('should logout and navigate to root when refresh token throws error', fakeAsync(() => {
    const testUrl = '/api/test';
    let completed = false;

    localStorageService.get.and.returnValue('valid-token');
    authService.refreshToken.and.returnValue(
      Promise.reject(new Error('Refresh failed'))
    );

    httpClient
      .get(testUrl, {
        headers: { Authorization: 'Bearer old-token' },
      })
      .subscribe({
        next: () => {
          fail('Should not succeed when refresh token throws error');
        },
        error: () => {
          fail('Should complete without error');
        },
        complete: () => {
          completed = true;
        },
      });

    const req = httpMock.expectOne(testUrl);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    tick();

    expect(authService.refreshToken).toHaveBeenCalled();
    expect(authService.logOut).toHaveBeenCalled();
    expect(navigationService.navigateToRoot).toHaveBeenCalled();
    expect(completed).toBe(true);
  }));

  it('should not attempt refresh for LoginUser endpoint', (done) => {
    const testUrl = '/api/LoginUser';

    httpClient.get(testUrl).subscribe({
      next: () => {
        fail('Should error without refresh');
        done();
      },
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
        expect(authService.refreshToken).not.toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('should not attempt refresh for RefreshToken endpoint', (done) => {
    const testUrl = '/api/RefreshToken';

    httpClient.get(testUrl).subscribe({
      next: () => {
        fail('Should error without refresh');
        done();
      },
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
        expect(authService.refreshToken).not.toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('should not attempt refresh when no Authorization header present', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => {
        fail('Should error without refresh');
        done();
      },
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
        expect(authService.refreshToken).not.toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne(testUrl);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('should pass through non-401 errors', (done) => {
    const testUrl = '/api/test';

    httpClient.get(testUrl).subscribe({
      next: () => {
        fail('Should error');
        done();
      },
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(500);
        expect(authService.refreshToken).not.toHaveBeenCalled();
        done();
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(null, { status: 500, statusText: 'Internal Server Error' });
  });
});
