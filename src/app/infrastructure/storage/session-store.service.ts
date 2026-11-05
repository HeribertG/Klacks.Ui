// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The browser-side record of a session. The access and refresh tokens live in HttpOnly cookies that scripts cannot
 * read, so a session is recognised by the non-secret profile the login stored (user id, user name, subject, app
 * version) plus the access-token expiry, which is only a hint for when a renewal is due; the server's 401 stays the
 * authority. Keys that older builds wrote are handled here and nowhere else: a session that only an older build stored
 * (it still holds JWT_TOKEN or JWT_REFRESH) counts as signed in until its first renewal, and an access token it left
 * is dropped once it expired or on logout - never while it is still valid, because a tab with the older bundle may
 * still be open in this browser and reads it on every request.
 * @param profile - Profile and expiry of a login, refresh, SSO callback or password change
 * @param bufferMs - Milliseconds before the stored expiry from which the access token already counts as expired
 */

import { inject, Injectable } from '@angular/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DEFAULT_TOKEN_EXPIRY_BUFFER_MS, isJwtExpired } from 'src/app/domain/helpers/jwt.helper';
import { ISessionProfile } from 'src/app/domain/models/auth/session-profile.interface';
import { LocalStorageService } from './local-storage.service';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private static readonly UNKNOWN_EXPIRY = '';

  private readonly localStorageService = inject(LocalStorageService);

  hasSession(): boolean {
    return (
      this.localStorageService.get(StorageKeys.TOKEN_USERID) !== null ||
      this.localStorageService.get(StorageKeys.LEGACY_ACCESS_TOKEN) !== null
    );
  }

  userId(): string | null {
    return this.localStorageService.get(StorageKeys.TOKEN_USERID);
  }

  userName(): string | null {
    return this.localStorageService.get(StorageKeys.TOKEN_USERNAME);
  }

  storeProfile(profile: ISessionProfile): void {
    this.localStorageService.set(StorageKeys.TOKEN_USERID, profile.id ?? '');
    this.localStorageService.set(StorageKeys.TOKEN_USERNAME, profile.username ?? '');
    if (profile.subject !== undefined) {
      this.localStorageService.set(StorageKeys.TOKEN_SUBJECT, profile.subject);
    }
    if (profile.version !== undefined) {
      this.localStorageService.set(StorageKeys.TOKEN_APPVERSION, profile.version);
    }
    this.storeAccessExpiry(profile.expTime);
  }

  storeAccessExpiry(expiry: Date | string | null | undefined): void {
    this.localStorageService.set(
      StorageKeys.TOKEN_EXP,
      expiry ? expiry.toString() : SessionStore.UNKNOWN_EXPIRY
    );
    this.dropExpiredLegacyAccessToken();
  }

  /**
   * True when the stored expiry has passed (or passes within the buffer) or is unknown. Only decides whether a
   * renewal is worth doing before the server would answer 401 anyway.
   */
  isAccessExpired(bufferMs: number = DEFAULT_TOKEN_EXPIRY_BUFFER_MS): boolean {
    const stored = this.localStorageService.get(StorageKeys.TOKEN_EXP);
    const expiresAt = stored ? Date.parse(stored) : Number.NaN;
    if (Number.isNaN(expiresAt)) {
      return true;
    }
    return Date.now() > expiresAt - bufferMs;
  }

  hasLegacyCredentials(): boolean {
    return (
      this.localStorageService.get(StorageKeys.LEGACY_ACCESS_TOKEN) !== null ||
      this.localStorageService.get(StorageKeys.TOKEN_REFRESHTOKEN) !== null
    );
  }

  legacyRefreshToken(): string | null {
    return this.localStorageService.get(StorageKeys.TOKEN_REFRESHTOKEN);
  }

  forgetLegacyRefreshToken(): void {
    this.localStorageService.remove(StorageKeys.TOKEN_REFRESHTOKEN);
  }

  dropExpiredLegacyAccessToken(): void {
    const legacyAccessToken = this.localStorageService.get(StorageKeys.LEGACY_ACCESS_TOKEN);
    if (legacyAccessToken !== null && isJwtExpired(legacyAccessToken, 0)) {
      this.localStorageService.remove(StorageKeys.LEGACY_ACCESS_TOKEN);
    }
  }

  clear(): void {
    this.localStorageService.remove(StorageKeys.LEGACY_ACCESS_TOKEN);
    this.localStorageService.remove(StorageKeys.TOKEN_REFRESHTOKEN);
    this.localStorageService.remove(StorageKeys.TOKEN_EXP);
    this.localStorageService.remove(StorageKeys.TOKEN_USERNAME);
    this.localStorageService.remove(StorageKeys.TOKEN_USERID);
    this.localStorageService.remove(StorageKeys.TOKEN_APPVERSION);
    this.localStorageService.remove(StorageKeys.TOKEN_SUBJECT);
  }
}
