// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Per-tab memory of reloads that were already attempted, used to break reload loops, and the token
 * through which the application layer reaches the storage implementation.
 * @param timestampMs - Epoch milliseconds of an automatic chunk reload
 * @param buildKey - Build key this tab last reloaded for
 */
import { InjectionToken } from '@angular/core';

export interface IReloadGuardStorage {
  readLastChunkReloadAt(): number | null;
  writeLastChunkReloadAt(timestampMs: number): void;
  readReloadedBuildKey(): string | null;
  writeReloadedBuildKey(buildKey: string): void;
}

export const RELOAD_GUARD_STORAGE = new InjectionToken<IReloadGuardStorage>('IReloadGuardStorage');
