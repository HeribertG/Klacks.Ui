// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Stores the session that an OAuth2 provider callback returned: token, user name (userName wins over username), user
 * id, expiry (empty text when unknown), the refresh token when one was issued, and the provider id that prefixes the
 * handshake state ("<providerId>_<nonce>") so a later logout can sign out at the same provider.
 * @param token - Token response of the OAuth2 callback endpoint
 * @param state - Handshake state echoed by the provider
 */

import { inject, Injectable } from '@angular/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { OAuth2Token } from 'src/app/domain/models/auth/oauth2-token.interface';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

@Injectable({ providedIn: 'root' })
export class OAuth2CallbackTokenStorageService {
  private static readonly STATE_SEPARATOR = '_';
  private static readonly UNKNOWN_EXPIRY = '';

  private localStorageService = inject(LocalStorageService);

  store(token: OAuth2Token, state: string): void {
    this.localStorageService.set(StorageKeys.TOKEN, token.token);
    this.localStorageService.set(StorageKeys.TOKEN_USERNAME, token.userName || token.username);
    this.localStorageService.set(StorageKeys.TOKEN_USERID, token.id);
    this.localStorageService.set(
      StorageKeys.TOKEN_EXP,
      token.expires?.toString() || OAuth2CallbackTokenStorageService.UNKNOWN_EXPIRY
    );
    if (token.refreshToken) {
      this.localStorageService.set(StorageKeys.TOKEN_REFRESHTOKEN, token.refreshToken);
    }

    const providerId = state.split(OAuth2CallbackTokenStorageService.STATE_SEPARATOR)[0];
    if (providerId) {
      this.localStorageService.set(StorageKeys.OAUTH2_PROVIDER_ID, providerId);
    }
  }
}
