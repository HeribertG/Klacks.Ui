// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests for DataGeocodingService: every search goes to the backend proxy as a POST with the address in the
 * body, never in the URL and never to a geocoder host.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataGeocodingService } from './data-geocoding.service';
import { environment } from 'src/environments/environment';
import { IGeocodingSearchResult } from 'src/app/domain/models/geo/geocoding-search-result.interface';
import { GeocodingSearchStatus } from 'src/app/domain/models/geo/geocoding-search-status.model';
import { GEOCODING_QUERY_MAX_LENGTH } from 'src/app/domain/constants/geo-services-api.constants';

const SEARCH_URL = `${environment.baseUrl}Geocoding/Search`;
const QUERY = 'Bahnhofstrasse 1, Zürich';
const LANGUAGE = 'de';

const FOUND: IGeocodingSearchResult = {
  status: GeocodingSearchStatus.Found,
  latitude: 47.37,
  longitude: 8.54,
  displayName: 'Zürich, Schweiz',
};

describe('DataGeocodingService', () => {
  let service: DataGeocodingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataGeocodingService],
    });
    service = TestBed.inject(DataGeocodingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts exactly one request to the backend proxy with query and language in the body', () => {
    let result: IGeocodingSearchResult | undefined;
    service.searchAddress(QUERY, LANGUAGE).subscribe((r) => (result = r));

    const request = httpMock.expectOne((r) => r.url === SEARCH_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ query: QUERY, language: LANGUAGE });
    request.flush(FOUND);

    expect(result).toEqual(FOUND);
  });

  it('keeps the address out of the URL', () => {
    service.searchAddress(QUERY, LANGUAGE).subscribe();

    const request = httpMock.expectOne((r) => r.url === SEARCH_URL);
    expect(request.request.urlWithParams).toBe(SEARCH_URL);
    expect(request.request.params.keys()).toEqual([]);
    request.flush(FOUND);
  });

  it('sends the trimmed query', () => {
    service.searchAddress(`  ${QUERY}  `, LANGUAGE).subscribe();

    const request = httpMock.expectOne((r) => r.url === SEARCH_URL);
    expect(request.request.body).toEqual({ query: QUERY, language: LANGUAGE });
    request.flush(FOUND);
  });

  it.each([
    { label: 'shorter than the minimum', query: ' a ' },
    { label: 'longer than the maximum', query: 'x'.repeat(GEOCODING_QUERY_MAX_LENGTH + 1) },
  ])('answers NotFound without a request for a query $label', ({ query }) => {
    let result: IGeocodingSearchResult | undefined;
    service.searchAddress(query, LANGUAGE).subscribe((r) => (result = r));

    httpMock.expectNone((r) => r.url === SEARCH_URL);
    expect(result?.status).toBe(GeocodingSearchStatus.NotFound);
  });

  it('passes a Disabled answer through unchanged', () => {
    let result: IGeocodingSearchResult | undefined;
    service.searchAddress(QUERY, LANGUAGE).subscribe((r) => (result = r));

    httpMock.expectOne((r) => r.url === SEARCH_URL).flush({
      status: GeocodingSearchStatus.Disabled,
      latitude: null,
      longitude: null,
      displayName: null,
    });

    expect(result?.status).toBe(GeocodingSearchStatus.Disabled);
  });

  it.each([
    { status: 429, statusText: 'Too Many Requests' },
    { status: 500, statusText: 'Server Error' },
  ])('reports Unavailable without retrying when the proxy answers $status', (response) => {
    let result: IGeocodingSearchResult | undefined;
    service.searchAddress(QUERY, LANGUAGE).subscribe((r) => (result = r));

    httpMock.expectOne((r) => r.url === SEARCH_URL).flush(null, response);

    expect(result?.status).toBe(GeocodingSearchStatus.Unavailable);
  });
});
