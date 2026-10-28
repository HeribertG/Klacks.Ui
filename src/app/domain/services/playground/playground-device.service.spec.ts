// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { PLAYGROUND_DEVICE_HEADER } from 'src/app/domain/constants/playground.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { PlaygroundDeviceService } from './playground-device.service';

const DEVICE_TOKEN = 'signedDeviceToken1234567890';
const STORED_TOKEN = 'storedDeviceToken1234567890';

describe('PlaygroundDeviceService', () => {
  let service: PlaygroundDeviceService;
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };

  const configure = (stored: string | null): void => {
    storage = { get: vi.fn(() => stored), set: vi.fn(), remove: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: storage }] });
    service = TestBed.inject(PlaygroundDeviceService);
  };

  describe('limit inactive', () => {
    it('writes nothing to storage and sends no header', () => {
      // Arrange
      configure(null);

      // Act
      service.applyStatus({ limitActive: false, deviceToken: null });

      // Assert
      expect(service.limitActive()).toBe(false);
      expect(service.deviceToken()).toBeNull();
      expect(service.deviceHeaders()).toEqual({});
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('ignores a device token the server sends anyway', () => {
      // Arrange
      configure(null);

      // Act
      service.applyStatus({ limitActive: false, deviceToken: DEVICE_TOKEN });

      // Assert
      expect(storage.set).not.toHaveBeenCalled();
      expect(service.deviceHeaders()).toEqual({});
    });

    it('sends no header before the status is known, even with a token left in storage', () => {
      // Arrange
      configure(STORED_TOKEN);

      // Assert
      expect(service.deviceHeaders()).toEqual({});
    });
  });

  describe('limit active', () => {
    it('stores a freshly minted token and exposes it as header and token', () => {
      // Arrange
      configure(null);

      // Act
      service.applyStatus({ limitActive: true, deviceToken: DEVICE_TOKEN });

      // Assert
      expect(service.limitActive()).toBe(true);
      expect(storage.set).toHaveBeenCalledWith(StorageKeys.PLAYGROUND_DEVICE_TOKEN, DEVICE_TOKEN);
      expect(service.deviceToken()).toBe(DEVICE_TOKEN);
      expect(service.deviceHeaders()).toEqual({ [PLAYGROUND_DEVICE_HEADER]: DEVICE_TOKEN });
    });

    it('keeps the stored token when the server does not mint a new one', () => {
      // Arrange
      configure(STORED_TOKEN);

      // Act
      service.applyStatus({ limitActive: true, deviceToken: null });

      // Assert
      expect(service.deviceToken()).toBe(STORED_TOKEN);
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('replaces the stored token when the server mints a new one', () => {
      // Arrange
      configure(STORED_TOKEN);

      // Act
      service.applyStatus({ limitActive: true, deviceToken: DEVICE_TOKEN });

      // Assert
      expect(service.deviceToken()).toBe(DEVICE_TOKEN);
      expect(storage.set).toHaveBeenCalledWith(StorageKeys.PLAYGROUND_DEVICE_TOKEN, DEVICE_TOKEN);
    });

    it('works for the session when storage throws on write', () => {
      // Arrange
      configure(null);
      storage.set.mockImplementation(() => {
        throw new Error('storage unavailable');
      });

      // Act
      service.applyStatus({ limitActive: true, deviceToken: DEVICE_TOKEN });

      // Assert
      expect(service.deviceToken()).toBe(DEVICE_TOKEN);
    });

    it('treats a throwing storage read as no stored token', () => {
      // Arrange
      configure(null);
      storage.get.mockImplementation(() => {
        throw new Error('storage unavailable');
      });

      // Act
      service.applyStatus({ limitActive: true, deviceToken: null });

      // Assert
      expect(service.storedToken()).toBeNull();
      expect(service.deviceToken()).toBeNull();
      expect(service.deviceHeaders()).toEqual({});
    });
  });

  describe('implausible tokens', () => {
    it.each(['', 'short', 'has spaces in the stored token 123', 'line\nbreak12345678901234567'])(
      'discards the stored value %j and asks for a fresh token',
      (stored) => {
        // Arrange
        configure(stored);

        // Act
        const token = service.storedToken();

        // Assert
        expect(token).toBeNull();
        expect(storage.remove).toHaveBeenCalledWith(StorageKeys.PLAYGROUND_DEVICE_TOKEN);
      },
    );

    it('removes nothing when no token is stored', () => {
      // Arrange
      configure(null);

      // Act
      const token = service.storedToken();

      // Assert
      expect(token).toBeNull();
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('does not use or persist a server token of implausible shape', () => {
      // Arrange
      configure(null);

      // Act
      service.applyStatus({ limitActive: true, deviceToken: 'bad token' });

      // Assert
      expect(service.limitActive()).toBe(true);
      expect(service.deviceHeaders()).toEqual({});
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('does not send an implausible stored token when the server mints none', () => {
      // Arrange
      configure('bad token');

      // Act
      service.applyStatus({ limitActive: true, deviceToken: null });

      // Assert
      expect(service.deviceHeaders()).toEqual({});
    });
  });
});
