// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import type { MockInstance } from 'vitest';
import { AppErrorHandler } from './app.error-handler';
import { ChunkLoadRecoveryService } from './application/services/chunk-load-recovery.service';

const CHUNK_ERROR = new TypeError('Failed to fetch dynamically imported module: https://klacks.example/chunk-7QX2LMNB.js');
const UNHANDLED_ERROR_LOG_MESSAGE = 'Unhandled Application Error:';
const INVALID_ERROR_LOG_MESSAGE = 'Invalid error object:';

describe('AppErrorHandler', () => {
  let handler: AppErrorHandler;
  let recoverChunk: ReturnType<typeof vi.fn>;
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    recoverChunk = vi.fn().mockReturnValue(false);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [AppErrorHandler, { provide: ChunkLoadRecoveryService, useValue: { handleError: recoverChunk } }],
    });
    handler = TestBed.inject(AppErrorHandler);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hands a chunk-load failure to the chunk recovery and logs nothing', () => {
    recoverChunk.mockReturnValue(true);

    handler.handleError(CHUNK_ERROR);

    expect(recoverChunk).toHaveBeenCalledWith(CHUNK_ERROR);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('stays silent for an HTTP error the response interceptor already reported', () => {
    handler.handleError({ rejection: { name: 'HttpErrorResponse' } });

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('stays silent for a known, ignored framework error', () => {
    handler.handleError(new Error('ExpressionChangedAfterItHasBeenCheckedError: Expression has changed'));

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('stays silent for an ignored error wrapped by zone.js as an unhandled promise rejection', () => {
    const original = new Error('ExpressionChangedAfterItHasBeenCheckedError: Expression has changed');
    const wrapper = Object.assign(new Error(`Uncaught (in promise): ${original.message}`), { rejection: original });

    handler.handleError(wrapper);

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('logs every other error', () => {
    const error = new Error('Something broke');

    handler.handleError(error);

    expect(consoleError).toHaveBeenCalledWith(UNHANDLED_ERROR_LOG_MESSAGE, error);
  });

  it('logs a value that is not an error object without asking the chunk recovery', () => {
    handler.handleError('plain text');

    expect(consoleError).toHaveBeenCalledWith(INVALID_ERROR_LOG_MESSAGE, 'plain text');
    expect(recoverChunk).not.toHaveBeenCalled();
  });

  it('still logs the error when the chunk recovery cannot be resolved', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AppErrorHandler,
        {
          provide: ChunkLoadRecoveryService,
          useFactory: () => {
            throw new Error('No provider');
          },
        },
      ],
    });
    const isolated = TestBed.inject(AppErrorHandler);
    const error = new Error('Something broke');

    isolated.handleError(error);

    expect(consoleError).toHaveBeenCalledWith(UNHANDLED_ERROR_LOG_MESSAGE, error);
  });
});
