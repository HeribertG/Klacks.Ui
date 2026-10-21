// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ChunkLoaderFilter } from './chunk-loader-filter.interface';
import { DestroyRef } from '@angular/core';
import { Observable } from 'rxjs';

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
