// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataProactiveAttributionService } from './data-proactive-attribution.service';
import { IProactiveShiftAttribution } from 'src/app/domain/models/assistant/proactive-shift-attribution.interface';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { environment } from 'src/environments/environment';

describe('DataProactiveAttributionService', () => {
  let service: DataProactiveAttributionService;
  let httpMock: HttpTestingController;
  let apiUrl: string;

  const mockAttributions: IProactiveShiftAttribution[] = [
    { entityId: 'container-1', handledAtUtc: '2026-08-26T10:00:00Z', triggerKind: 'empty_container' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataProactiveAttributionService],
    });
    service = TestBed.inject(DataProactiveAttributionService);
    httpMock = TestBed.inject(HttpTestingController);
    apiUrl = `${environment.baseAssistantUrl}proactive-conditions/attributions`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should post the entity ids and return the attributions', () => {
    let received: IProactiveShiftAttribution[] | undefined;

    service.getByEntityIds(['container-1']).subscribe((result) => (received = result));

    const request = httpMock.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ entityIds: ['container-1'] });
    request.flush(mockAttributions);

    expect(received).toEqual(mockAttributions);
  });

  it('should mark the request as skipping the loading spinner', () => {
    service.getByEntityIds(['container-1']).subscribe();

    const request = httpMock.expectOne(apiUrl);
    expect(request.request.context.get(SKIP_LOADING)).toBe(true);
    request.flush([]);
  });

  it('should not call the server at all for an empty id list', () => {
    let received: IProactiveShiftAttribution[] | undefined;

    service.getByEntityIds([]).subscribe((result) => (received = result));

    httpMock.expectNone(apiUrl);
    expect(received).toEqual([]);
  });

  // The marker is decoration on a grid that must keep working without it, so a failing lookup
  // resolves to "no attributions" rather than surfacing an error the caller would have to handle.
  it('should fall back to an empty list when the server keeps failing', () => {
    let received: IProactiveShiftAttribution[] | undefined;

    service.getByEntityIds(['container-1']).subscribe((result) => (received = result));

    for (let attempt = 0; attempt < 3; attempt++) {
      httpMock.expectOne(apiUrl).flush('failed', { status: 500, statusText: 'Server Error' });
    }

    expect(received).toEqual([]);
  });
});
