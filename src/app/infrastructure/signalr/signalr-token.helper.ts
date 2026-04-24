// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Token lifecycle helper for SignalR: expiry detection, backend validation and silent refresh.
 * @param localStorage - Reads and writes JWT and refresh tokens from local storage
 */
import { LocalStorageService } from '../storage/local-storage.service';
import { StorageKeys } from '../constants/storage-keys';
import { environment } from 'src/environments/environment';

const TOKEN_EXPIRY_BUFFER_MS = 30000;

export class SignalRTokenHelper {
  constructor(private readonly localStorage: LocalStorageService) {}

  isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      if (!payload) return true;
      const decoded = JSON.parse(atob(payload));
      if (!decoded.exp) return false;
      return Date.now() > decoded.exp * 1000 - TOKEN_EXPIRY_BUFFER_MS;
    } catch {
      return true;
    }
  }

  async attemptTokenRefresh(): Promise<void> {
    try {
      const refreshToken = this.localStorage.get(StorageKeys.TOKEN_REFRESHTOKEN);
      if (!refreshToken) {
        console.warn('[SignalR] no refresh token in storage - cannot refresh');
        return;
      }

      const refreshUrl = environment.baseUrl + 'Accounts/RefreshToken';
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.warn('[SignalR] refresh endpoint returned', response.status);
        return;
      }

      const data = await response.json();
      if (!data?.token) {
        console.warn('[SignalR] refresh response missing token field');
        return;
      }

      this.localStorage.set(StorageKeys.TOKEN, data.token);
      if (data.refreshToken) {
        this.localStorage.set(StorageKeys.TOKEN_REFRESHTOKEN, data.refreshToken);
      }
      if (data.expTime !== undefined && data.expTime !== null) {
        this.localStorage.set(StorageKeys.TOKEN_EXP, data.expTime.toString());
      }
    } catch (error) {
      console.warn('[SignalR] refresh request failed', error);
    }
  }

  async validateTokenWithBackend(token: string): Promise<boolean> {
    try {
      const validateUrl = environment.baseUrl + 'Accounts/ValidateToken';
      const response = await fetch(validateUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
