// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';
import { ChunkLoader } from './chunk-loader';

interface TestFilter {
  startRow: number;
  rowCount: number;
}

function createLoader(fetch: () => Observable<number>): ChunkLoader<TestFilter, number> {
  return new ChunkLoader<TestFilter, number>({
    fetch,
    onInitialResponse: () => undefined,
    onChunkResponse: () => undefined,
    hasMore: () => false,
    nextChunkFilter: (rowCount) => ({ startRow: 0, rowCount }),
    destroyRef: TestBed.inject(DestroyRef),
  });
}

describe('ChunkLoader initial load state', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('is pending from load() until the initial response arrives', () => {
    // Arrange
    const response$ = new Subject<number>();
    const loader = createLoader(() => response$);

    // Act
    loader.load({ startRow: 0, rowCount: 10 });
    const pendingBefore = loader.isInitialPending();
    response$.next(1);

    // Assert
    expect(pendingBefore).toBe(true);
    expect(loader.isInitialPending()).toBe(false);
    expect(loader.isInitialFailed()).toBe(false);
  });

  it('marks the initial load as failed when the first request errors', () => {
    // Arrange
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const loader = createLoader(() => throwError(() => new Error('network')));

    // Act
    loader.load({ startRow: 0, rowCount: 10 });

    // Assert
    expect(loader.isInitialPending()).toBe(false);
    expect(loader.isInitialFailed()).toBe(true);
  });

  it('clears the failed state on the next load', () => {
    // Arrange
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let fail = true;
    const response$ = new Subject<number>();
    const loader = createLoader(() => (fail ? throwError(() => new Error('network')) : response$));
    loader.load({ startRow: 0, rowCount: 10 });

    // Act
    fail = false;
    loader.load({ startRow: 0, rowCount: 10 });
    response$.next(1);

    // Assert
    expect(loader.isInitialFailed()).toBe(false);
    expect(loader.isInitialPending()).toBe(false);
  });
});
