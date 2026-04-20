// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generic paginated-chunk loader used by work and shift schedule loaders.
 * Centralises the load-id guard, exponential chunk-size growth, setTimeout
 * recursion, auto-load toggle and manual subscription bookkeeping that was
 * previously duplicated in both loaders.
 *
 * The domain state (arrays, maps, totals) lives in the caller; the loader
 * receives hooks for each lifecycle event.
 *
 * The `pendingOnLoaded` callback is captured on `load()` and fired exactly
 * once after the initial response, never from an auto-load chunk. This
 * structurally prevents the bug class where a `resetScroll: true` closure
 * re-fired on every chunk (cf. commit 8cdcad1a).
 *
 * @param fetch - Observable factory for one chunk (initial or subsequent)
 * @param onInitialResponse - State mutator for the very first response
 * @param onChunkResponse - State mutator for subsequent chunks, receives the requested chunkSize
 * @param hasMore - Returns true while more chunks should be fetched
 * @param nextChunkFilter - Builds the filter for the next auto-load chunk
 * @param destroyRef - DestroyRef of the hosting service for subscription teardown
 */
import {
  DestroyRef,
  WritableSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  Subject,
  Subscription,
  catchError,
  switchMap,
} from 'rxjs';

export interface ChunkLoaderFilter {
  startRow: number;
  rowCount: number;
}

export interface ChunkLoaderConfig<TFilter extends ChunkLoaderFilter, TResponse> {
  destroyRef: DestroyRef;
  fetch: (filter: TFilter) => Observable<TResponse>;
  onInitialResponse: (response: TResponse) => void;
  onChunkResponse: (response: TResponse, chunkSize: number) => void;
  hasMore: () => boolean;
  nextChunkFilter: (chunkSize: number) => TFilter;
  onInitialError?: (err: unknown) => boolean;
  onAutoChunkError?: (err: unknown) => void;
  initialDelayMs?: number;
  subsequentDelayMs?: number;
  initialChunkSize?: number;
  chunkSizeGrowth?: number;
  maxChunkSize?: number;
}

const DEFAULT_INITIAL_CHUNK_SIZE = 200;
const DEFAULT_CHUNK_SIZE_GROWTH = 2;
const DEFAULT_INITIAL_DELAY_MS = 100;
const DEFAULT_SUBSEQUENT_DELAY_MS = 50;

export class ChunkLoader<TFilter extends ChunkLoaderFilter, TResponse> {
  private readonly loadTrigger$ = new Subject<TFilter>();
  private currentLoadId = 0;
  private pendingOnLoaded?: () => void;
  private loadMoreSub?: Subscription;
  private autoLoadEnabled = true;
  private currentChunkSize: number;

  public readonly isLoadingMore: WritableSignal<boolean> = signal(false);
  public readonly isRead: WritableSignal<number> = signal(0);

  constructor(private readonly config: ChunkLoaderConfig<TFilter, TResponse>) {
    this.currentChunkSize = config.initialChunkSize ?? DEFAULT_INITIAL_CHUNK_SIZE;
    this.setupInitialPipeline();
  }

  load(initialFilter: TFilter, onLoaded?: () => void): void {
    this.loadMoreSub?.unsubscribe();
    this.currentLoadId++;
    this.autoLoadEnabled = true;
    this.currentChunkSize = this.config.initialChunkSize ?? DEFAULT_INITIAL_CHUNK_SIZE;
    this.isLoadingMore.set(false);
    this.pendingOnLoaded = onLoaded;
    this.loadTrigger$.next(initialFilter);
  }

  retryInitial(filter: TFilter): void {
    this.loadTrigger$.next(filter);
  }

  disableAutoLoad(): void {
    this.autoLoadEnabled = false;
  }

  private setupInitialPipeline(): void {
    this.loadTrigger$
      .pipe(
        switchMap((filter) =>
          this.config.fetch(filter).pipe(
            catchError((err) => {
              const handled = this.config.onInitialError?.(err) ?? false;
              if (!handled) {
                console.error('Error loading initial chunk:', err);
                this.firePendingOnLoaded();
              }
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.config.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.config.onInitialResponse(response);
          this.isRead.update((v) => v + 1);
          this.firePendingOnLoaded();

          if (this.autoLoadEnabled && this.config.hasMore()) {
            const loadId = this.currentLoadId;
            setTimeout(
              () => this.autoLoadNextChunk(loadId),
              this.config.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS,
            );
          }
        },
        error: (err) => {
          console.error('Critical error in chunk load pipeline:', err);
          this.firePendingOnLoaded();
        },
      });
  }

  private autoLoadNextChunk(loadId: number): void {
    if (loadId !== this.currentLoadId) {
      return;
    }
    if (!this.autoLoadEnabled || !this.config.hasMore() || this.isLoadingMore()) {
      return;
    }

    this.isLoadingMore.set(true);
    const filter = this.config.nextChunkFilter(this.currentChunkSize);
    const chunkSize = this.currentChunkSize;

    this.loadMoreSub?.unsubscribe();
    this.loadMoreSub = this.config
      .fetch(filter)
      .pipe(takeUntilDestroyed(this.config.destroyRef))
      .subscribe({
        next: (response) => {
          if (loadId !== this.currentLoadId) {
            this.isLoadingMore.set(false);
            return;
          }

          this.config.onChunkResponse(response, chunkSize);

          if (!this.config.hasMore()) {
            this.autoLoadEnabled = false;
          } else {
            const growth = this.config.chunkSizeGrowth ?? DEFAULT_CHUNK_SIZE_GROWTH;
            const maxSize = this.config.maxChunkSize ?? Number.MAX_SAFE_INTEGER;
            this.currentChunkSize = Math.min(this.currentChunkSize * growth, maxSize);
          }

          this.isLoadingMore.set(false);
          this.isRead.update((v) => v + 1);

          if (this.autoLoadEnabled && this.config.hasMore()) {
            setTimeout(
              () => this.autoLoadNextChunk(loadId),
              this.config.subsequentDelayMs ?? DEFAULT_SUBSEQUENT_DELAY_MS,
            );
          }
        },
        error: (err) => {
          this.config.onAutoChunkError?.(err);
          console.error('Error auto-loading chunk:', err);
          this.isLoadingMore.set(false);
          this.autoLoadEnabled = false;
        },
      });
  }

  private firePendingOnLoaded(): void {
    const callback = this.pendingOnLoaded;
    this.pendingOnLoaded = undefined;
    callback?.();
  }
}
