// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Token lifecycle helper for SignalR: expiry detection, backend validation and silent refresh.
 * @param localStorage - Reads and writes JWT and refresh tokens from local storage
 * @param dataAuthService - Performs the refresh through the shared single-flight endpoint
 */
import { firstValueFrom } from 'rxjs';
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { environment } from 'src/environments/environment';
import { DataAuthService } from '../api/data-auth.service';
import { isJwtExpired } from 'src/app/shared/helpers/jwt.helper';

export class SignalRTokenHelper {
  constructor(
    private readonly localStorage: LocalStorageService,
    private readonly dataAuthService: DataAuthService,
  ) {}

  isTokenExpired(token: string): boolean {
    return isJwtExpired(token);
  }

  async attemptTokenRefresh(): Promise<void> {
    try {
      const refreshToken = this.localStorage.get(StorageKeys.TOKEN_REFRESHTOKEN);
      if (!refreshToken) {
        console.warn('[SignalR] no refresh token in storage - cannot refresh');
        return;
      }

      const token = await firstValueFrom(
        this.dataAuthService.refreshToken({ refreshToken }),
      );

      if (!token?.token) {
        console.warn('[SignalR] refresh response missing token field');
        return;
      }

      this.localStorage.set(StorageKeys.TOKEN, token.token);
      if (token.refreshToken) {
        this.localStorage.set(StorageKeys.TOKEN_REFRESHTOKEN, token.refreshToken);
      }
      this.localStorage.set(StorageKeys.TOKEN_EXP, token.expTime.toString());
    } catch (error) {
      console.warn('[SignalR] token refresh failed', error);
    }
  }

  async validateTokenWithBackend(token: string): Promise<TokenValidationResult> {
    try {
      const validateUrl = environment.baseUrl + 'Accounts/ValidateToken';
      const response = await fetch(validateUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) return 'valid';
      if (response.status === 401 || response.status === 403) return 'rejected';
      return 'unreachable';
    } catch {
      return 'unreachable';
    }
  }
}

export type TokenValidationResult = 'valid' | 'rejected' | 'unreachable';
