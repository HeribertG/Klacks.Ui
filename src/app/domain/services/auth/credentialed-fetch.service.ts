// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * fetch() for the API calls that bypass HttpClient and its interceptors (chat stream, text-to-speech, Whisper admin).
 * Only a URL of the own API (isInternalApiUrl, the rule the HTTP interceptors use) gets the session treatment; any other
 * URL is fetched plainly, without credentials, CSRF header or renewal. The session lives in HttpOnly cookies, so each
 * own-API call is sent with credentials (needed when the Ui runs on another origin than the API, as in development) and
 * with the CSRF marker header X-Requested-With; no Authorization header is ever set. A 401 of a tab with a local session
 * renews the session once through the shared single-flight refresh and repeats the call once; a rejected or failed
 * renewal hands the original 401 back to the caller. The refresh client is resolved only when a renewal is due, so the
 * HTTP stack is not pulled in for calls that never need one.
 * @param input - Absolute or relative URL of the API endpoint
 * @param init - Request options with plain-object headers; they are kept and the credential settings are added
 */

import { inject, Injectable, Injector } from '@angular/core';
import { HttpStatusCode } from '@angular/common/http';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';
import { SessionRenewalOutcome } from 'src/app/domain/enums/session-renewal-outcome.enum';
import { DataAuthService } from 'src/app/infrastructure/api/data-auth.service';
import { SessionStore } from 'src/app/infrastructure/storage/session-store.service';
import { isInternalApiUrl } from 'src/app/domain/helpers/internal-api-url.helper';
import { environment } from 'src/environments/environment';

type CredentialedRequestInit = Omit<RequestInit, 'headers' | 'credentials'> & { headers?: Record<string, string> };

@Injectable({ providedIn: 'root' })
export class CredentialedFetchService {
  private readonly injector = inject(Injector);
  private readonly sessionStore = inject(SessionStore);

  async fetch(input: string, init: CredentialedRequestInit = {}): Promise<Response> {
    if (!isInternalApiUrl(input, environment.baseUrl)) {
      return fetch(input, init);
    }

    const response = await fetch(input, this.withCredentials(init));
    if (response.status !== HttpStatusCode.Unauthorized || !this.sessionStore.hasSession()) {
      return response;
    }

    const outcome = await this.injector.get(DataAuthService).renewSession();
    if (outcome !== SessionRenewalOutcome.Renewed) {
      return response;
    }
    return fetch(input, this.withCredentials(init));
  }

  private withCredentials(init: CredentialedRequestInit): RequestInit {
    return {
      ...init,
      headers: { ...init.headers, [X_REQUESTED_WITH_HEADER]: X_REQUESTED_WITH_VALUE },
      credentials: 'include',
    };
  }
}
