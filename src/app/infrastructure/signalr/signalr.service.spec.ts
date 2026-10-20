// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { SignalRService } from './signalr.service';
import { SignalRConnectionHelper, SignalRConnectionCallbacks } from './signalr-connection.helper';
import { SignalRTokenHelper } from './signalr-token.helper';
import { LocalStorageService } from '../storage/local-storage.service';
import { DataAuthService } from '../api/data-auth.service';
import { StorageKeys } from '../constants/storage-keys';

const FIRST_RECONNECT_WINDOW_MS = 3000;

describe('SignalRService - full reconnect after a closed connection', () => {
  let service: SignalRService;
  let startSpy: ReturnType<typeof vi.spyOn>;
  let capturedCallbacks: SignalRConnectionCallbacks | null;

  beforeEach(() => {
    vi.useFakeTimers();
    capturedCallbacks = null;
    startSpy = vi
      .spyOn(SignalRConnectionHelper.prototype, 'startConnection')
      .mockImplementation(async (_register, callbacks) => {
        capturedCallbacks = callbacks;
      });
    vi.spyOn(SignalRConnectionHelper.prototype, 'stopConnection').mockResolvedValue(undefined);
    vi.spyOn(SignalRTokenHelper.prototype, 'isTokenExpired').mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: LocalStorageService,
          useValue: { get: vi.fn((key: string) => (key === StorageKeys.TOKEN ? 'a-token' : null)) },
        },
        { provide: DataAuthService, useValue: {} },
      ],
    });
    service = TestBed.inject(SignalRService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('reconnects exactly once after a real close', async () => {
    // Arrange
    await service.startConnection();

    // Act
    capturedCallbacks!.onClosed();
    await vi.advanceTimersByTimeAsync(FIRST_RECONNECT_WINDOW_MS);

    // Assert
    expect(startSpy).toHaveBeenCalledTimes(2);
  });

  it('drops a pending reconnect when the connection is stopped on purpose', async () => {
    // Arrange
    await service.startConnection();
    capturedCallbacks!.onClosed();

    // Act
    await service.stopConnection();
    await vi.advanceTimersByTimeAsync(FIRST_RECONNECT_WINDOW_MS);

    // Assert
    expect(startSpy).toHaveBeenCalledTimes(1);
  });
});
