// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Per-tab memory of reloads that were already attempted, used to break reload loops, and the token
 * through which the application layer reaches the storage implementation.
 * @param timestampMs - Epoch milliseconds of an automatic chunk reload
 * @param buildKey - Build key a version reload was requested for
 */
import { InjectionToken } from '@angular/core';

export interface IReloadGuardStorage {
  readLastChunkReloadAt(): number | null;
  writeLastChunkReloadAt(timestampMs: number): void;
  readVersionReloadTarget(): string | null;
  writeVersionReloadTarget(buildKey: string): void;
}

export const RELOAD_GUARD_STORAGE = new InjectionToken<IReloadGuardStorage>('IReloadGuardStorage');
