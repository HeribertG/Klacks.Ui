// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Searches an address through the backend geocoding proxy; the browser never contacts a geocoder itself.
 * A switched-off service answers with status Disabled, a failed request is reported as Unavailable, so the
 * caller can tell "no hit" apart from "not possible right now".
 * @param query - Free-text address to search for
 * @param language - Preferred language of the returned display name
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { GEOCODING_SEARCH_PATH } from 'src/app/domain/constants/geo-services-api.constants';
import { IGeocodingSearchResult } from 'src/app/domain/models/geo/geocoding-search-result.interface';
import { GeocodingSearchStatus } from 'src/app/domain/models/geo/geocoding-search-status.model';

const QUERY_PARAM = 'query';
const LANGUAGE_PARAM = 'language';

const UNAVAILABLE_RESULT: IGeocodingSearchResult = {
  status: GeocodingSearchStatus.Unavailable,
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
    const params = new HttpParams().set(QUERY_PARAM, query).set(LANGUAGE_PARAM, language);

    return this.httpClient
      .get<IGeocodingSearchResult>(`${environment.baseUrl}${GEOCODING_SEARCH_PATH}`, {
        params,
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(catchError(() => of(UNAVAILABLE_RESULT)));
  }
}
