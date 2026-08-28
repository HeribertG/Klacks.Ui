// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { ResponseInterceptor } from './http-interceptor';
import { WorkplaceStateService } from '../../application/services/workplace-state.service';
import { ToastShowService } from '../toast/toast-show.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { DataTranslationService } from 'src/app/infrastructure/api/translation/data-translation.service';
import { BackendAvailabilityService } from 'src/app/application/services/backend-availability.service';

const API_REQUEST_URL = '/api/backend/resource';
const FOREIGN_REQUEST_URL = 'https://third-party.example.com/api/route';

const BAD_GATEWAY = { status: 502, statusText: 'Bad Gateway' };
const GATEWAY_TIMEOUT = { status: 504, statusText: 'Gateway Timeout' };
const GATEWAY_FAILURE_RESPONSES = [BAD_GATEWAY, GATEWAY_TIMEOUT];
const SERVICE_UNAVAILABLE = { status: 503, statusText: 'Service Unavailable' };

const NOT_FOUND = { status: 404, statusText: 'Not Found' };
const CONNECTION_FAILED_STATUS = 0;
const HTTP_ERROR_404_KEY = 'HTTP_ERROR_404';
const NOT_FOUND_TOAST_NAME = '404';

const KLACKSY_LEARNING_PHRASE_URL = '/api/backend/assistant/learning/phrases/1';
const CONFLICT = { status: 409, statusText: 'Conflict' };
const SERVER_ERROR = { status: 500, statusText: 'Internal Server Error' };

describe('ResponseInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let toastShowService: any;
  let backendAvailabilityService: any;

  const expectRequestToFail = (url: string): { status: number | null } => {
    const captured: { status: number | null } = { status: null };
    httpClient.get(url).subscribe({
      next: () => {
        throw new Error('Request should have failed');
      },
      error: (error: HttpErrorResponse) => {
        captured.status = error.status;
      },
    });
    return captured;
  };

  beforeEach(() => {
    const workplaceStateServiceSpy = {
      isDirty: false,
      isSavedOrReset: false,
      showProgressSpinner: vi.fn(),
    };
    const toastShowServiceSpy = {
      showError: vi.fn(),
      showInfo: vi.fn(),
    };
    const navigationServiceSpy = {
      navigateToError: vi.fn(),
    };
    const translateServiceSpy = {
      currentLang: 'en',
      instant: vi.fn((key: string) => key),
    };
    const dataTranslationServiceSpy = {
      translateToAll: vi.fn(),
    };
    const backendAvailabilityServiceSpy = {
      reportReachable: vi.fn(),
      reportUnavailable: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ResponseInterceptor,
          multi: true,
        },
        { provide: WorkplaceStateService, useValue: workplaceStateServiceSpy },
        { provide: ToastShowService, useValue: toastShowServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: DataTranslationService, useValue: dataTranslationServiceSpy },
        { provide: BackendAvailabilityService, useValue: backendAvailabilityServiceSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    toastShowService = TestBed.inject(ToastShowService) as any;
    backendAvailabilityService = TestBed.inject(BackendAvailabilityService) as any;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('gateway failures on the own API (reverse proxy answers for a dead backend)', () => {
    it.each(GATEWAY_FAILURE_RESPONSES)(
      'reports $status as a backend outage without showing an error toast',
      (response) => {
        const captured = expectRequestToFail(API_REQUEST_URL);

        const req = httpMock.expectOne(API_REQUEST_URL);
        req.flush(null, response);

        expect(backendAvailabilityService.reportUnavailable).toHaveBeenCalledTimes(1);
        expect(toastShowService.showError).not.toHaveBeenCalled();
        expect(toastShowService.showInfo).not.toHaveBeenCalled();
        expect(captured.status).toBe(response.status);
      }
    );

    it('does not report an outage for 503, which the API itself returns for a dead downstream', () => {
      const captured = expectRequestToFail(API_REQUEST_URL);

      const req = httpMock.expectOne(API_REQUEST_URL);
      req.flush(null, SERVICE_UNAVAILABLE);

      expect(backendAvailabilityService.reportUnavailable).not.toHaveBeenCalled();
      expect(toastShowService.showError).toHaveBeenCalledTimes(1);
      expect(captured.status).toBe(SERVICE_UNAVAILABLE.status);
    });

    it('does not report an outage for a gateway status from a foreign host', () => {
      const captured = expectRequestToFail(FOREIGN_REQUEST_URL);

      const req = httpMock.expectOne(FOREIGN_REQUEST_URL);
      req.flush(null, BAD_GATEWAY);

      expect(backendAvailabilityService.reportUnavailable).not.toHaveBeenCalled();
      expect(toastShowService.showError).toHaveBeenCalledTimes(1);
      expect(captured.status).toBe(BAD_GATEWAY.status);
    });
  });

  describe('connection failures (status 0)', () => {
    it('still reports the backend unavailable without showing an error toast', () => {
      const captured = expectRequestToFail(API_REQUEST_URL);

      const req = httpMock.expectOne(API_REQUEST_URL);
      req.error(new ProgressEvent('error'));

      expect(backendAvailabilityService.reportUnavailable).toHaveBeenCalledTimes(1);
      expect(toastShowService.showError).not.toHaveBeenCalled();
      expect(toastShowService.showInfo).not.toHaveBeenCalled();
      expect(captured.status).toBe(CONNECTION_FAILED_STATUS);
    });
  });

  describe('genuine application errors', () => {
    it('shows the 404 error toast and does not report an outage', () => {
      const captured = expectRequestToFail(API_REQUEST_URL);

      const req = httpMock.expectOne(API_REQUEST_URL);
      req.flush(null, NOT_FOUND);

      expect(toastShowService.showError).toHaveBeenCalledWith(HTTP_ERROR_404_KEY, NOT_FOUND_TOAST_NAME);
      expect(backendAvailabilityService.reportUnavailable).not.toHaveBeenCalled();
      expect(captured.status).toBe(NOT_FOUND.status);
    });
  });

  describe('klacksy learning pass-through (component already shows its own toast)', () => {
    it('does not show a generic toast for a 409 on a learning path', () => {
      const captured = expectRequestToFail(KLACKSY_LEARNING_PHRASE_URL);

      const req = httpMock.expectOne(KLACKSY_LEARNING_PHRASE_URL);
      req.flush(null, CONFLICT);

      expect(toastShowService.showError).not.toHaveBeenCalled();
      expect(captured.status).toBe(CONFLICT.status);
    });

    it('still shows the generic toast for a 500 on the same learning path', () => {
      const captured = expectRequestToFail(KLACKSY_LEARNING_PHRASE_URL);

      const req = httpMock.expectOne(KLACKSY_LEARNING_PHRASE_URL);
      req.flush(null, SERVER_ERROR);

      expect(toastShowService.showError).toHaveBeenCalledTimes(1);
      expect(captured.status).toBe(SERVER_ERROR.status);
    });

    it('still shows the generic toast for a 409 on an unrelated path', () => {
      const captured = expectRequestToFail(API_REQUEST_URL);

      const req = httpMock.expectOne(API_REQUEST_URL);
      req.flush(null, CONFLICT);

      expect(toastShowService.showError).toHaveBeenCalledTimes(1);
      expect(captured.status).toBe(CONFLICT.status);
    });
  });
});
