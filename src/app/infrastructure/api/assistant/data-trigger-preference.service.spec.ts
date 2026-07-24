// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataTriggerPreferenceService } from './data-trigger-preference.service';
import { ITriggerPreference } from 'src/app/domain/interfaces/trigger-preference.interface';
import { environment } from 'src/environments/environment';

describe('DataTriggerPreferenceService', () => {
  let service: DataTriggerPreferenceService;
  let httpMock: HttpTestingController;
  let apiUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataTriggerPreferenceService],
    });
    service = TestBed.inject(DataTriggerPreferenceService);
    httpMock = TestBed.inject(HttpTestingController);
    apiUrl = `${environment.baseAssistantUrl}trigger-preferences`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('muteKind puts muted true to trigger-preferences/{kind}', () => {
    const updated: ITriggerPreference = {
      triggerKind: 'unstaffed_shift',
      muted: true,
      snoozedUntilUtc: null,
      minimumSeverity: null,
    };

    service.muteKind('unstaffed_shift').subscribe((result) => {
      expect(result).toEqual(updated);
    });

    const req = httpMock.expectOne(`${apiUrl}/unstaffed_shift`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ muted: true });
    req.flush(updated);
  });

  it('muteKind retries three times on failure', () => {
    let receivedError: unknown;
    service.muteKind('unstaffed_shift').subscribe({
      error: (error) => {
        receivedError = error;
      },
    });

    for (let attempt = 0; attempt < 4; attempt++) {
      const req = httpMock.expectOne(`${apiUrl}/unstaffed_shift`);
      req.error(new ProgressEvent('error'));
    }
    expect(receivedError).toBeDefined();
  });
});
