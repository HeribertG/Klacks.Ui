// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpStatusCode } from '@angular/common/http';

import { DataAnalyseScenarioService } from './data-analyse-scenario.service';
import { environment } from 'src/environments/environment';

describe('DataAnalyseScenarioService', () => {
  let service: DataAnalyseScenarioService;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataAnalyseScenarioService],
    });
    service = TestBed.inject(DataAnalyseScenarioService);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = environment.baseUrl + 'AnalyseScenarios';
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('accept', () => {
    it('should not retry on 409 Conflict and pass the error through immediately', () => {
      let receivedError: unknown;
      service.accept('scenario-1').subscribe({
        next: () => fail('expected an error'),
        error: (error) => (receivedError = error),
      });

      const req = httpMock.expectOne(`${baseUrl}/scenario-1/Accept`);
      req.flush(
        { detail: 'blocked' },
        { status: HttpStatusCode.Conflict, statusText: 'Conflict' },
      );

      httpMock.verify();
      expect((receivedError as { status: number }).status).toBe(HttpStatusCode.Conflict);
    });

    it('should retry up to 3 times on transient errors', () => {
      let receivedError: unknown;
      service.accept('scenario-1').subscribe({
        next: () => fail('expected an error'),
        error: (error) => (receivedError = error),
      });

      for (let i = 0; i < 4; i++) {
        // Initial request + 3 retries
        const req = httpMock.expectOne(`${baseUrl}/scenario-1/Accept`);
        req.error(new ProgressEvent('error'));
      }

      expect(receivedError).toBeDefined();
    });

    it('should append overrideBlock query param when requested', () => {
      service.accept('scenario-1', true).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/scenario-1/Accept?overrideBlock=true`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });
});
