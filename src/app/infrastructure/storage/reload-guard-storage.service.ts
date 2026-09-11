// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Remembers, per browser tab, which reloads were already attempted: the time of the last automatic
 * chunk reload and the build key a version reload was last requested for. sessionStorage survives
 * the reload itself but is not inherited by a new tab. A storage that throws (private modes, disabled
 * storage) degrades to "nothing remembered".
 */
import { Injectable } from '@angular/core';
import { IReloadGuardStorage } from 'src/app/domain/interfaces/reload-guard-storage.interface';

const LAST_CHUNK_RELOAD_KEY = 'klacks.last-chunk-reload-at';
const VERSION_RELOAD_TARGET_KEY = 'klacks.version-reload-target';

@Injectable({
  providedIn: 'root',
})
export class ReloadGuardStorageService implements IReloadGuardStorage {
  readLastChunkReloadAt(): number | null {
    const stored = this.read(LAST_CHUNK_RELOAD_KEY);
    if (stored === null) {
      return null;
    }
    const timestampMs = Number(stored);
    return Number.isFinite(timestampMs) ? timestampMs : null;
  }

  writeLastChunkReloadAt(timestampMs: number): void {
    this.write(LAST_CHUNK_RELOAD_KEY, String(timestampMs));
  }

  readVersionReloadTarget(): string | null {
    return this.read(VERSION_RELOAD_TARGET_KEY);
  }

  writeVersionReloadTarget(buildKey: string): void {
    this.write(VERSION_RELOAD_TARGET_KEY, buildKey);
  }

  private read(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      return;
    }
  }
}
