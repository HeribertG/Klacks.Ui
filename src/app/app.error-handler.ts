// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Application-wide ErrorHandler. Hands failed chunk loads of an outdated bundle to the chunk recovery,
 * stays silent for HTTP errors (the response interceptor reports them) and for a fixed list of known,
 * harmless framework and library errors, and logs everything else. It must never throw itself, so a
 * chunk recovery that cannot be resolved is skipped.
 * @param injector - Resolves ChunkLoadRecoveryService on first use; the ErrorHandler is created before
 * the router the recovery depends on
 */
import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { ChunkLoadRecoveryService } from './application/services/chunk-load-recovery.service';

const HTTP_ERROR_RESPONSE_NAME = 'HttpErrorResponse';
const INVALID_ERROR_LOG_MESSAGE = 'Invalid error object:';
const UNHANDLED_ERROR_LOG_MESSAGE = 'Unhandled Application Error:';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);

  private static readonly IGNORED_ERROR_PATTERNS = [
    'ExpressionChangedAfterItHasBeenCheckedError',
    'Unable to preventDefault inside passive event listener due to target being treated as passive',
    "Failed to execute 'removeChild' on 'Node'",
    "Cannot read property 'style' of null",
    "Cannot read property 'style' of undefined",
    "Cannot read property 'currentTarget' of undefined",
    "Cannot destructure property 'drake' of 'this.group' as it is undefined",
    "Cannot read property 'close' of undefined",
    "Cannot read property 'content' of undefined",
    "Cannot set property 'order' of null",
  ];

  handleError(error: unknown): void {
    if (!error || typeof error !== 'object') {
      console.error(INVALID_ERROR_LOG_MESSAGE, error);
      return;
    }

    if (this.recoverFromChunkLoadError(error)) {
      return;
    }

    if (this.isHttpError(error) || this.shouldIgnoreError(error)) {
      return;
    }

    console.error(UNHANDLED_ERROR_LOG_MESSAGE, error);
  }

  private recoverFromChunkLoadError(error: object): boolean {
    try {
      return this.injector.get(ChunkLoadRecoveryService).handleError(error);
    } catch {
      return false;
    }
  }

  private isHttpError(error: object): boolean {
    const rejection = (error as { rejection?: { name?: unknown } | null }).rejection;
    return rejection?.name === HTTP_ERROR_RESPONSE_NAME;
  }

  private shouldIgnoreError(error: object): boolean {
    const message = (error as { message?: unknown }).message;
    return (
      typeof message === 'string' &&
      AppErrorHandler.IGNORED_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
    );
  }
}
