// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { SetupRequiredInterceptor } from './setup-required.interceptor';
import { SETUP_REQUIRED_ERROR_CODE } from 'src/app/domain/models/setup/setup-required.model';
import { NavigationService } from '../services/navigation.service';

describe('SetupRequiredInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let navigationService: any;

  beforeEach(() => {
    const navigationServiceSpy = {
      navigateToSetup: vi.fn(),
      isOnSetupPage: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: SetupRequiredInterceptor,
          multi: true,
        },
        { provide: NavigationService, useValue: navigationServiceSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    navigationService = TestBed.inject(NavigationService) as any;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should redirect to setup and swallow the error on a SETUP_REQUIRED 403', async () => {
    const testUrl = '/api/test';
    let completed = false;

    httpClient.get(testUrl).subscribe({
      next: () => {
        throw new Error('Should not succeed');
      },
      error: () => {
        throw new Error('Should complete without error');
      },
      complete: () => {
        completed = true;
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(
      { errorCode: SETUP_REQUIRED_ERROR_CODE },
      { status: 403, statusText: 'Forbidden' }
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(navigationService.navigateToSetup).toHaveBeenCalled();
    expect(completed).toBe(true);
  });

  it('should not redirect again when already on the setup page', async () => {
    navigationService.isOnSetupPage.mockReturnValue(true);
    const testUrl = '/api/test';
    let erroredStatus = 0;

    httpClient.get(testUrl).subscribe({
      next: () => {
        throw new Error('Should not succeed');
      },
      error: (error: HttpErrorResponse) => {
        erroredStatus = error.status;
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(
      { errorCode: SETUP_REQUIRED_ERROR_CODE },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(navigationService.navigateToSetup).not.toHaveBeenCalled();
    expect(erroredStatus).toBe(403);
  });

  it('should pass through a 403 that is not SETUP_REQUIRED', async () => {
    const testUrl = '/api/test';
    let erroredStatus = 0;

    httpClient.get(testUrl).subscribe({
      next: () => {
        throw new Error('Should not succeed');
      },
      error: (error: HttpErrorResponse) => {
        erroredStatus = error.status;
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush({ errorCode: 'SOME_OTHER_CODE' }, { status: 403, statusText: 'Forbidden' });

    expect(navigationService.navigateToSetup).not.toHaveBeenCalled();
    expect(erroredStatus).toBe(403);
  });

  it('should pass through non-403 errors', async () => {
    const testUrl = '/api/test';
    let erroredStatus = 0;

    httpClient.get(testUrl).subscribe({
      next: () => {
        throw new Error('Should not succeed');
      },
      error: (error: HttpErrorResponse) => {
        erroredStatus = error.status;
      },
    });

    const req = httpMock.expectOne(testUrl);
    req.flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(navigationService.navigateToSetup).not.toHaveBeenCalled();
    expect(erroredStatus).toBe(500);
  });
});
