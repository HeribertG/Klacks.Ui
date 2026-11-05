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
            get: (key: string): string | null => store[key] ?? null,
            set: (key: string, value: string): void => {
              store[key] = value;
            },
            remove: (key: string): void => {
              delete store[key];
            },
          },
        },
      ],
    });
    service = TestBed.inject(OAuth2CallbackTokenStorageService);
  });

  function token(overrides: Partial<OAuth2Token>): OAuth2Token {
    return { token: 'jwt', username: 'fallback-name', id: 'user-1', ...overrides } as OAuth2Token;
  }

  it('stores the profile, expiry and provider id but never the access token', () => {
    const expTime = new Date(Date.UTC(2026, 9, 22, 12, 0, 0));

    store[StorageKeys.TOKEN_REFRESHTOKEN] = 'legacy-refresh';

    service.store(token({ userName: 'Display Name', expTime }), 'google_nonce');

    expect(StorageKeys.LEGACY_ACCESS_TOKEN in store).toBe(false);
    expect(store[StorageKeys.TOKEN_USERNAME]).toBe('Display Name');
    expect(store[StorageKeys.TOKEN_USERID]).toBe('user-1');
    expect(store[StorageKeys.TOKEN_EXP]).toBe(expTime.toString());
    expect(StorageKeys.TOKEN_REFRESHTOKEN in store).toBe(false);
    expect(store[StorageKeys.OAUTH2_PROVIDER_ID]).toBe('google');
  });

  it('reads the expiry only from expTime, the field the OAuth2 callback endpoint sends', () => {
    const expTime = new Date(Date.UTC(2026, 10, 5, 9, 30, 0));
    const wireToken = { ...token({ expTime }), expires: new Date(Date.UTC(2030, 0, 1)) };

    service.store(wireToken, 'google_nonce');

    expect(store[StorageKeys.TOKEN_EXP]).toBe(expTime.toString());
  });

  it('falls back to username and empty expiry and skips a missing provider id', () => {
    service.store(token({}), '_nonce');

    expect(store[StorageKeys.TOKEN_USERNAME]).toBe('fallback-name');
    expect(store[StorageKeys.TOKEN_EXP]).toBe('');
    expect(StorageKeys.TOKEN_REFRESHTOKEN in store).toBe(false);
    expect(StorageKeys.OAUTH2_PROVIDER_ID in store).toBe(false);
  });
});
