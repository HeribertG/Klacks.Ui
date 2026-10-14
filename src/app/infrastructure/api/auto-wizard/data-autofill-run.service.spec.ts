// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { DataAutofillRunService } from './data-autofill-run.service';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { IAutofillRunPresence } from 'src/app/domain/interfaces/autofill-run-presence.interface';

const RUN: IAutofillRunPresence = {
  runId: 'run-1',
  groupId: null,
  periodFrom: '2026-06-01',
  periodUntil: '2026-06-30',
  progressPercent: null,
};

describe('DataAutofillRunService', () => {
  let service: DataAutofillRunService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataAutofillRunService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads the active runs without the global loading spinner', async () => {
    // Arrange
    const promise = firstValueFrom(service.getActive());

    // Act
    const request = httpMock.expectOne((req) => req.url.endsWith('AutofillRuns/Active'));
    request.flush([RUN]);

    // Assert
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(SKIP_LOADING)).toBe(true);
    expect(await promise).toEqual([RUN]);
  });
});
