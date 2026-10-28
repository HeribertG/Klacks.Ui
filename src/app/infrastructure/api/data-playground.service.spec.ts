// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import {
  PLAYGROUND_STATUS_PATH,
  PLAYGROUND_STATUS_RETRY_COUNT,
} from 'src/app/domain/constants/playground.constants';
import { DataPlaygroundService } from './data-playground.service';

const NOT_FOUND = { status: 404, statusText: 'Not Found' };
const SERVER_ERROR = { status: 500, statusText: 'Server Error' };
const STATUS_URL_PATTERN = new RegExp(`${PLAYGROUND_STATUS_PATH}$`);
const INACTIVE_STATUS = { limitActive: false, deviceToken: null };

describe('DataPlaygroundService', () => {
  let service: DataPlaygroundService;
  let httpMock: HttpTestingController;

  const matchStatusRequest = (request: { url: string }): boolean => STATUS_URL_PATTERN.test(request.url);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DataPlaygroundService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('runs without the global spinner', () => {
    // Act
    service.getStatus(null).subscribe();

    // Assert
    const request = httpMock.expectOne(matchStatusRequest);
    expect(request.request.context.get(SKIP_LOADING)).toBe(true);
    request.flush(INACTIVE_STATUS);
  });

  it('costs exactly one request when an older backend answers 404', () => {
    // Arrange
    const failures: unknown[] = [];
    service.getStatus(null).subscribe({ error: (error) => failures.push(error) });

    // Act
    httpMock.expectOne(matchStatusRequest).flush(null, NOT_FOUND);

    // Assert
    httpMock.expectNone(matchStatusRequest);
    expect(failures).toHaveLength(1);
  });

  it('retries a server error up to the retry count and then fails', () => {
    // Arrange
    const failures: unknown[] = [];
    service.getStatus(null).subscribe({ error: (error) => failures.push(error) });

    // Act
    for (let attempt = 0; attempt <= PLAYGROUND_STATUS_RETRY_COUNT; attempt++) {
      httpMock.expectOne(matchStatusRequest).flush(null, SERVER_ERROR);
    }

    // Assert
    httpMock.expectNone(matchStatusRequest);
    expect(failures).toHaveLength(1);
  });

  it('retries a network failure and returns the later answer', () => {
    // Arrange
    const answers: unknown[] = [];
    service.getStatus(null).subscribe((status) => answers.push(status));

    // Act
    httpMock.expectOne(matchStatusRequest).error(new ProgressEvent('error'));
    httpMock.expectOne(matchStatusRequest).flush(INACTIVE_STATUS);

    // Assert
    expect(answers).toEqual([INACTIVE_STATUS]);
  });
});
