// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { OAuth2Token } from 'src/app/domain/models/auth/oauth2-token.interface';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { OAuth2CallbackTokenStorageService } from './oauth2-callback-token-storage.service';

describe('OAuth2CallbackTokenStorageService', () => {
  let service: OAuth2CallbackTokenStorageService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    TestBed.configureTestingModule({
      providers: [
        OAuth2CallbackTokenStorageService,
        {
          provide: LocalStorageService,
          useValue: {
            set: (key: string, value: string): void => {
              store[key] = value;
            },
          },
        },
      ],
    });
    service = TestBed.inject(OAuth2CallbackTokenStorageService);
  });

  function token(overrides: Partial<OAuth2Token>): OAuth2Token {
    return { token: 'jwt', username: 'fallback-name', id: 'user-1', refreshToken: '', ...overrides } as OAuth2Token;
  }

  it('stores the session and the provider id taken from the state prefix', () => {
    const expires = new Date(Date.UTC(2026, 9, 22, 12, 0, 0));

    service.store(token({ userName: 'Display Name', expires, refreshToken: 'refresh' }), 'google_nonce');

    expect(store[StorageKeys.TOKEN]).toBe('jwt');
    expect(store[StorageKeys.TOKEN_USERNAME]).toBe('Display Name');
    expect(store[StorageKeys.TOKEN_USERID]).toBe('user-1');
    expect(store[StorageKeys.TOKEN_EXP]).toBe(expires.toString());
    expect(store[StorageKeys.TOKEN_REFRESHTOKEN]).toBe('refresh');
    expect(store[StorageKeys.OAUTH2_PROVIDER_ID]).toBe('google');
  });

  it('falls back to username and empty expiry and skips a missing refresh token or provider id', () => {
    service.store(token({}), '_nonce');

    expect(store[StorageKeys.TOKEN_USERNAME]).toBe('fallback-name');
    expect(store[StorageKeys.TOKEN_EXP]).toBe('');
    expect(StorageKeys.TOKEN_REFRESHTOKEN in store).toBe(false);
    expect(StorageKeys.OAUTH2_PROVIDER_ID in store).toBe(false);
  });
});
