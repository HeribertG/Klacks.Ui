// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Searches an address through the backend geocoding proxy; the browser never contacts a geocoder itself.
 * The address travels in the POST body, never in the URL, so it does not end up in proxy access logs.
 * A switched-off service answers with status Disabled, a failed request is reported as Unavailable, so the
 * caller can tell "no hit" apart from "not possible right now". A query outside the length the backend
 * accepts cannot be an address and is answered with NotFound without a request.
 * @param query - Free-text address to search for
 * @param language - Preferred language of the returned display name (a single BCP-47 tag)
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  GEOCODING_QUERY_MAX_LENGTH,
  GEOCODING_QUERY_MIN_LENGTH,
  GEOCODING_SEARCH_PATH,
} from 'src/app/domain/constants/geo-services-api.constants';
import { IGeocodingSearchRequest } from 'src/app/domain/models/geo/geocoding-search-request.interface';
import { IGeocodingSearchResult } from 'src/app/domain/models/geo/geocoding-search-result.interface';
import { GeocodingSearchStatus } from 'src/app/domain/models/geo/geocoding-search-status.model';

const UNAVAILABLE_RESULT: IGeocodingSearchResult = {
  status: GeocodingSearchStatus.Unavailable,
  latitude: null,
  longitude: null,
  displayName: null,
};

const NOT_FOUND_RESULT: IGeocodingSearchResult = {
  status: GeocodingSearchStatus.NotFound,
  latitude: null,
  longitude: null,
  displayName: null,
};

@Injectable({
  providedIn: 'root',
})
export class DataGeocodingService {
  private httpClient = inject(HttpClient);

  searchAddress(query: string, language: string = DomainMessages.DEFAULT_LANG): Observable<IGeocodingSearchResult> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < GEOCODING_QUERY_MIN_LENGTH || trimmedQuery.length > GEOCODING_QUERY_MAX_LENGTH) {
      return of(NOT_FOUND_RESULT);
    }

    const body: IGeocodingSearchRequest = { query: trimmedQuery, language };

    return this.httpClient
      .post<IGeocodingSearchResult>(`${environment.baseUrl}${GEOCODING_SEARCH_PATH}`, body, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(catchError(() => of(UNAVAILABLE_RESULT)));
  }
}
