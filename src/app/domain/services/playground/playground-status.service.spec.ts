// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { PLAYGROUND_STATUS_TIMEOUT_MS } from 'src/app/domain/constants/playground.constants';
import { PlaygroundStatus } from 'src/app/domain/models/playground/playground-status.interface';
import { DataPlaygroundService } from 'src/app/infrastructure/api/data-playground.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { PlaygroundDeviceService } from './playground-device.service';
import { PlaygroundStatusGateService } from './playground-status-gate.service';
import { PlaygroundStatusService } from './playground-status.service';

const STORED_TOKEN = 'storedDeviceToken1234567890';
const INACTIVE_STATUS = { limitActive: false, deviceToken: null };
const ACTIVE_STATUS = { limitActive: true, deviceToken: null };
const httpError = (status: number) => throwError(() => new HttpErrorResponse({ status }));

describe('PlaygroundStatusService', () => {
  let service: PlaygroundStatusService;
  let gate: PlaygroundStatusGateService;
  let device: { storedToken: ReturnType<typeof vi.fn>; applyStatus: ReturnType<typeof vi.fn> };
  let data: { getStatus: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    device = { storedToken: vi.fn(() => STORED_TOKEN), applyStatus: vi.fn() };
    data = { getStatus: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: PlaygroundDeviceService, useValue: device },
        { provide: DataPlaygroundService, useValue: data },
      ],
    });
    service = TestBed.inject(PlaygroundStatusService);
    gate = TestBed.inject(PlaygroundStatusGateService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the server with the stored token and applies the answer', async () => {
    // Arrange
    data.getStatus.mockReturnValue(of(ACTIVE_STATUS));

    // Act
    await service.load();

    // Assert
    expect(data.getStatus).toHaveBeenCalledWith(STORED_TOKEN);
    expect(device.applyStatus).toHaveBeenCalledWith(ACTIVE_STATUS);
    expect(gate.statusUnknown()).toBe(false);
  });

  it('treats a valid "no limit" answer as final and never asks again', async () => {
    // Arrange
    data.getStatus.mockReturnValue(of(INACTIVE_STATUS));

    // Act
    await service.load();
    gate.recheckIfUnknown();

    // Assert
    expect(device.applyStatus).toHaveBeenCalledWith(INACTIVE_STATUS);
    expect(gate.statusUnknown()).toBe(false);
    expect(data.getStatus).toHaveBeenCalledTimes(1);
  });

  it.each([400, 404])('treats a client error %s as "no limit" and not as unknown', async (status) => {
    // Arrange
    data.getStatus.mockReturnValue(httpError(status));

    // Act
    await service.load();
    gate.recheckIfUnknown();

    // Assert
    expect(device.applyStatus).toHaveBeenCalledWith(INACTIVE_STATUS);
    expect(gate.statusUnknown()).toBe(false);
    expect(data.getStatus).toHaveBeenCalledTimes(1);
  });

  it.each([0, 500, 503])('leaves the status unknown after HTTP status %s', async (status) => {
    // Arrange
    data.getStatus.mockReturnValue(httpError(status));

    // Act
    await service.load();

    // Assert
    expect(gate.statusUnknown()).toBe(true);
    expect(device.applyStatus).not.toHaveBeenCalled();
    expect(gate.statusResolved()).toBe(true);
  });

  it('leaves the status unknown after a non-HTTP failure', async () => {
    // Arrange
    data.getStatus.mockReturnValue(throwError(() => new Error('network down')));

    // Act
    await service.load();

    // Assert
    expect(gate.statusUnknown()).toBe(true);
    expect(gate.statusResolved()).toBe(true);
  });

  it('keeps the gate closed while the request is in flight and opens it after the answer', async () => {
    // Arrange
    const answer = new Subject<PlaygroundStatus>();
    data.getStatus.mockReturnValue(answer);

    // Act
    const loading = service.load();

    // Assert
    expect(gate.statusResolved()).toBe(false);
    answer.next(ACTIVE_STATUS);
    await loading;
    expect(gate.statusResolved()).toBe(true);
  });

  it('gives up after the timeout, leaves the status unknown and opens the gate', async () => {
    // Arrange
    vi.useFakeTimers();
    data.getStatus.mockReturnValue(NEVER);

    // Act
    const loading = service.load();
    await vi.advanceTimersByTimeAsync(PLAYGROUND_STATUS_TIMEOUT_MS - 1);
    expect(gate.statusResolved()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await loading;

    // Assert
    expect(gate.statusResolved()).toBe(true);
    expect(gate.statusUnknown()).toBe(true);
    expect(device.applyStatus).not.toHaveBeenCalled();
  });

  describe('recheck of an unknown status', () => {
    it('asks once more on request, holds the gate meanwhile and applies the later answer', async () => {
      // Arrange
      data.getStatus.mockReturnValueOnce(httpError(503));
      await service.load();
      const answer = new Subject<PlaygroundStatus>();
      data.getStatus.mockReturnValueOnce(answer);

      // Act
      gate.recheckIfUnknown();

      // Assert
      expect(data.getStatus).toHaveBeenCalledTimes(2);
      expect(gate.statusResolved()).toBe(false);
      answer.next(ACTIVE_STATUS);
      await vi.waitFor(() => expect(gate.statusResolved()).toBe(true));
      expect(device.applyStatus).toHaveBeenCalledWith(ACTIVE_STATUS);
      expect(gate.statusUnknown()).toBe(false);
    });

    it('asks only one extra time even when the status stays unknown', async () => {
      // Arrange
      data.getStatus.mockReturnValue(httpError(503));
      await service.load();

      // Act
      gate.recheckIfUnknown();
      await vi.waitFor(() => expect(gate.statusResolved()).toBe(true));
      gate.recheckIfUnknown();

      // Assert
      expect(gate.statusUnknown()).toBe(true);
      expect(data.getStatus).toHaveBeenCalledTimes(2);
    });
  });
});

describe('PlaygroundStatusService with the real device state', () => {
  it('writes nothing to local storage when the limit is inactive, even after a 404', async () => {
    // Arrange
    const storage = { get: vi.fn(() => null), set: vi.fn(), remove: vi.fn() };
    const data = { getStatus: vi.fn(() => httpError(404)) };
    TestBed.configureTestingModule({
      providers: [
        { provide: LocalStorageService, useValue: storage },
        { provide: DataPlaygroundService, useValue: data },
      ],
    });

    // Act
    await TestBed.inject(PlaygroundStatusService).load();

    // Assert
    expect(TestBed.inject(PlaygroundDeviceService).limitActive()).toBe(false);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('keeps the limit inactive and writes nothing while the status is unknown', async () => {
    // Arrange
    const storage = { get: vi.fn(() => null), set: vi.fn(), remove: vi.fn() };
    const data = { getStatus: vi.fn(() => httpError(500)) };
    TestBed.configureTestingModule({
      providers: [
        { provide: LocalStorageService, useValue: storage },
        { provide: DataPlaygroundService, useValue: data },
      ],
    });

    // Act
    await TestBed.inject(PlaygroundStatusService).load();

    // Assert
    expect(TestBed.inject(PlaygroundDeviceService).limitActive()).toBe(false);
    expect(TestBed.inject(PlaygroundStatusGateService).statusUnknown()).toBe(true);
    expect(storage.set).not.toHaveBeenCalled();
  });
});
