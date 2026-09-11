// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Detects that a lazily loaded chunk of the running bundle is gone from the server, either from a
 * router NavigationError or from an error reported through the global ErrorHandler, and asks for a
 * reload - of the URL the user tried to open when it is known. At most one automatic chunk reload per
 * 60 seconds, remembered across the reload in session storage, so a chunk that is missing in the new
 * build as well leaves the user with a standing toast instead of a reload loop. Every chunk failure is
 * also announced on chunkLoadFailed$ for the version check.
 * @param error - Navigation or application error inspected for a chunk-load signature
 * @param targetUrl - URL of the failed navigation, loaded instead of the current URL
 */
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationError, Router } from '@angular/router';
import { Subject, filter } from 'rxjs';
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { RELOAD_GUARD_STORAGE } from 'src/app/domain/interfaces/reload-guard-storage.interface';
import { isChunkLoadError } from 'src/app/domain/helpers/chunk-load-error.helper';
import { AppReloadRequestService } from './app-reload-request.service';

const CHUNK_RELOAD_MIN_INTERVAL_MS = 60000;

@Injectable({
  providedIn: 'root',
})
export class ChunkLoadRecoveryService {
  private readonly router = inject(Router);
  private readonly reloadRequests = inject(AppReloadRequestService);
  private readonly guardStorage = inject(RELOAD_GUARD_STORAGE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chunkLoadFailed = new Subject<void>();
  private started = false;

  readonly chunkLoadFailed$ = this.chunkLoadFailed.asObservable();

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    this.router.events
      .pipe(
        filter((event): event is NavigationError => event instanceof NavigationError),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.handleError(event.error, event.url));
  }

  handleError(error: unknown, targetUrl?: string): boolean {
    if (!isChunkLoadError(error)) {
      return false;
    }

    this.chunkLoadFailed.next();
    this.reloadRequests.requestReload({
      reason: AppReloadReason.Chunk,
      targetUrl,
      autoReloadAllowed: !this.reloadedRecently(),
    });
    return true;
  }

  recordReload(): void {
    this.guardStorage.writeLastChunkReloadAt(Date.now());
  }

  private reloadedRecently(): boolean {
    const lastReloadAt = this.guardStorage.readLastChunkReloadAt();
    return lastReloadAt !== null && Date.now() - lastReloadAt < CHUNK_RELOAD_MIN_INTERVAL_MS;
  }
}
