// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Stores the session that an OAuth2 provider callback returned: user name (userName wins over username), user id,
 * access-token expiry (expTime of the API TokenResource, empty when unknown) and the provider id that prefixes the
 * handshake state ("<providerId>_<nonce>") so a later logout can sign out at the same provider. Access and refresh
 * token arrive as HttpOnly cookies and are never stored by the Ui; a refresh token an older build left in localStorage
 * is dropped so it can never override the cookie.
 * @param token - Token response of the OAuth2 callback endpoint
 * @param state - Handshake state echoed by the provider
 */

import { inject, Injectable } from '@angular/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { OAuth2Token } from 'src/app/domain/models/auth/oauth2-token.interface';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SessionStore } from 'src/app/infrastructure/storage/session-store.service';

@Injectable({ providedIn: 'root' })
export class OAuth2CallbackTokenStorageService {
  private static readonly STATE_SEPARATOR = '_';
  private localStorageService = inject(LocalStorageService);
  private sessionStore = inject(SessionStore);

  store(token: OAuth2Token, state: string): void {
    this.sessionStore.storeProfile({
      id: token.id,
      username: token.userName || token.username,
      expTime: token.expTime,
    });
    this.sessionStore.forgetLegacyRefreshToken();

    const providerId = state.split(OAuth2CallbackTokenStorageService.STATE_SEPARATOR)[0];
    if (providerId) {
      this.localStorageService.set(StorageKeys.OAUTH2_PROVIDER_ID, providerId);
    }
  }
}
