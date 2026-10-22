// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers the workplace page the user was on when an authentication loss forced a redirect to the login page,
 * so the next login can return there. Only workplace pages other than the dashboard are remembered, and only for
 * RETURN_URL_MAX_AGE_MS; consume() always clears the entry.
 * @param url - Router url (path plus optional query) of the page to remember
 */

import { inject, Injectable } from '@angular/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { ReturnUrlPayload } from 'src/app/domain/models/navigation/return-url-payload.interface';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

@Injectable({ providedIn: 'root' })
export class ReturnUrlMemoryService {
  private static readonly RETURN_URL_MAX_AGE_MS = 30 * 60 * 1000;
  private static readonly RESTORABLE_PREFIX = '/workplace/';
  private static readonly NON_RESTORABLE_PATHS = ['/workplace/dashboard'];
  private static readonly QUERY_SEPARATOR = '?';

  private localStorageService = inject(LocalStorageService);

  remember(url: string): void {
    if (this.isRestorableUrl(url)) {
      const payload: ReturnUrlPayload = { url, ts: Date.now() };
      this.localStorageService.setJson(StorageKeys.RETURN_URL, payload);
    } else {
      this.localStorageService.remove(StorageKeys.RETURN_URL);
    }
  }

  consume(): string | null {
    const payload = this.localStorageService.getJson(
      StorageKeys.RETURN_URL
    ) as ReturnUrlPayload | null;
    this.localStorageService.remove(StorageKeys.RETURN_URL);

    if (
      !payload ||
      typeof payload.url !== 'string' ||
      typeof payload.ts !== 'number'
    ) {
      return null;
    }

    const isFresh =
      Date.now() - payload.ts <= ReturnUrlMemoryService.RETURN_URL_MAX_AGE_MS;
    if (!isFresh || !this.isRestorableUrl(payload.url)) {
      return null;
    }

    return payload.url;
  }

  private isRestorableUrl(url: string): boolean {
    if (!url || !url.startsWith(ReturnUrlMemoryService.RESTORABLE_PREFIX)) {
      return false;
    }
    const path = url.split(ReturnUrlMemoryService.QUERY_SEPARATOR)[0];
    return !ReturnUrlMemoryService.NON_RESTORABLE_PATHS.includes(path);
  }
}
