// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { SessionStore } from './session-store.service';

function makeJwt(expSecondsFromNow: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }));
  return `header.${payload}.signature`;
}

function isoIn(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('has no session on an empty storage', () => {
    expect(store.hasSession()).toBe(false);
  });

  it('recognises a session by the stored profile and never stores a token', () => {
    store.storeProfile({ id: 'user-1', username: 'anna', subject: 'anna@example.test', version: '1.0', expTime: isoIn(900) });

    expect(store.hasSession()).toBe(true);
    expect(store.userId()).toBe('user-1');
    expect(store.userName()).toBe('anna');
    expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBeNull();
  });

  it('recognises a session that only an older build stored', () => {
    localStorage.setItem(StorageKeys.LEGACY_ACCESS_TOKEN, makeJwt(900));

    expect(store.hasSession()).toBe(true);
    expect(store.hasLegacyCredentials()).toBe(true);
  });

  it('treats a missing or unreadable expiry as expired', () => {
    expect(store.isAccessExpired()).toBe(true);

    localStorage.setItem(StorageKeys.TOKEN_EXP, 'not a date');
    expect(store.isAccessExpired()).toBe(true);
  });

  it('applies the buffer to the stored expiry', () => {
    store.storeAccessExpiry(isoIn(10));

    expect(store.isAccessExpired(0)).toBe(false);
    expect(store.isAccessExpired(30_000)).toBe(true);
  });

  it('keeps a still-valid legacy access token for tabs with the older bundle and drops an expired one', () => {
    localStorage.setItem(StorageKeys.LEGACY_ACCESS_TOKEN, makeJwt(900));
    store.dropExpiredLegacyAccessToken();
    expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).not.toBeNull();

    localStorage.setItem(StorageKeys.LEGACY_ACCESS_TOKEN, makeJwt(-60));
    store.storeAccessExpiry(isoIn(900));
    expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBeNull();
  });

  it('clears the profile, the expiry and every key an older build left', () => {
    store.storeProfile({ id: 'user-1', username: 'anna', expTime: isoIn(900) });
    localStorage.setItem(StorageKeys.LEGACY_ACCESS_TOKEN, makeJwt(900));
    localStorage.setItem(StorageKeys.TOKEN_REFRESHTOKEN, 'legacy');

    store.clear();

    expect(store.hasSession()).toBe(false);
    expect(localStorage.getItem(StorageKeys.TOKEN_EXP)).toBeNull();
    expect(localStorage.getItem(StorageKeys.LEGACY_ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(StorageKeys.TOKEN_REFRESHTOKEN)).toBeNull();
  });
});
