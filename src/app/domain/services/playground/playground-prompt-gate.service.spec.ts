// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import {
  PLAYGROUND_MAX_PROMPT_CHARS,
  PLAYGROUND_NOTICE_ACKNOWLEDGED_VALUE,
} from 'src/app/domain/constants/playground.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { PlaygroundDeviceService } from './playground-device.service';
import { PlaygroundStatusGateService } from './playground-status-gate.service';
import { PlaygroundPromptGateService } from './playground-prompt-gate.service';

describe('PlaygroundPromptGateService', () => {
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let service: PlaygroundPromptGateService;

  const configure = (stored: string | null, options: { throwing?: boolean } = {}): void => {
    storage = {
      get: vi.fn(() => {
        if (options.throwing) throw new Error('storage unavailable');
        return stored;
      }),
      set: vi.fn(() => {
        if (options.throwing) throw new Error('storage unavailable');
      }),
    };
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: storage }] });
    service = TestBed.inject(PlaygroundPromptGateService);
  };

  const activateLimit = (): void => {
    TestBed.inject(PlaygroundDeviceService).applyStatus({ limitActive: true, deviceToken: 'token' });
    storage.set.mockClear();
  };

  describe('status wait', () => {
    it('does not wait when no status load is running', async () => {
      configure(null);

      await expect(service.waitForStatus()).resolves.toBe(true);
      expect(service.statusResolved()).toBe(true);
    });

    it('waits for a running status load', async () => {
      configure(null);
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      statusGate.begin();
      const waiting = service.waitForStatus();

      expect(service.statusResolved()).toBe(false);
      statusGate.end();

      await expect(waiting).resolves.toBe(true);
    });

    it('rechecks an unknown status once and waits for the answer before it lets the send through', async () => {
      configure(null);
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      statusGate.markUnknown(true);
      statusGate.registerRecheck(async () => {
        statusGate.begin();
        await Promise.resolve();
        statusGate.markUnknown(false);
        statusGate.end();
      });

      const waiting = service.waitForStatus();

      expect(service.statusResolved()).toBe(false);
      await expect(waiting).resolves.toBe(true);
      expect(statusGate.statusUnknown()).toBe(false);
    });

    it('lets a second concurrent wait pass as false while the recheck runs', async () => {
      configure(null);
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      statusGate.markUnknown(true);
      let finish: () => void = () => undefined;
      statusGate.registerRecheck(() => {
        statusGate.begin();
        return new Promise<void>((resolve) => {
          finish = () => {
            statusGate.end();
            resolve();
          };
        });
      });

      const first = service.waitForStatus();
      const second = await service.waitForStatus();
      finish();

      expect(second).toBe(false);
      await expect(first).resolves.toBe(true);
    });

    it('goes through unchanged when the status stays unknown after the recheck', async () => {
      configure(null);
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      statusGate.markUnknown(true);
      statusGate.registerRecheck(async () => {
        statusGate.begin();
        statusGate.end();
      });

      await expect(service.waitForStatus()).resolves.toBe(true);
      await expect(service.waitForStatus()).resolves.toBe(true);
      expect(service.limitActive()).toBe(false);
      expect(service.confirmationPending()).toBe(false);
    });
  });

  describe('limit inactive', () => {
    it('neither asks for a confirmation nor limits the prompt length', () => {
      configure(null);

      expect(service.confirmationPending()).toBe(false);
      expect(service.maxPromptChars()).toBeNull();
      expect(service.exceedsLimit('x'.repeat(PLAYGROUND_MAX_PROMPT_CHARS * 2))).toBe(false);
    });

    it('writes nothing to storage when acknowledge is called', () => {
      configure(null);

      service.acknowledge();

      expect(storage.set).not.toHaveBeenCalled();
      expect(service.confirmationPending()).toBe(false);
    });
  });

  describe('limit active', () => {
    it('asks for the confirmation until it is given', () => {
      configure(null);
      activateLimit();

      expect(service.confirmationPending()).toBe(true);
    });

    it('persists the confirmation under the storage key', () => {
      configure(null);
      activateLimit();

      service.acknowledge();

      expect(service.confirmationPending()).toBe(false);
      expect(storage.set).toHaveBeenCalledWith(
        StorageKeys.PLAYGROUND_NOTICE_ACKNOWLEDGED,
        PLAYGROUND_NOTICE_ACKNOWLEDGED_VALUE,
      );
    });

    it('does not ask again when the stored flag is present', () => {
      configure(PLAYGROUND_NOTICE_ACKNOWLEDGED_VALUE);
      activateLimit();

      expect(service.confirmationPending()).toBe(false);
    });

    it('keeps the confirmation in memory when storage throws, and asks again on a fresh start', () => {
      configure(null, { throwing: true });
      activateLimit();

      service.acknowledge();

      expect(service.confirmationPending()).toBe(false);
      TestBed.resetTestingModule();
      configure(null, { throwing: true });
      activateLimit();
      expect(service.confirmationPending()).toBe(true);
    });

    it('accepts exactly the maximum prompt length and rejects one character more', () => {
      configure(null);
      activateLimit();

      expect(service.maxPromptChars()).toBe(PLAYGROUND_MAX_PROMPT_CHARS);
      expect(service.exceedsLimit('x'.repeat(PLAYGROUND_MAX_PROMPT_CHARS))).toBe(false);
      expect(service.exceedsLimit('x'.repeat(PLAYGROUND_MAX_PROMPT_CHARS + 1))).toBe(true);
      expect(service.exceedsLength(PLAYGROUND_MAX_PROMPT_CHARS)).toBe(false);
      expect(service.exceedsLength(PLAYGROUND_MAX_PROMPT_CHARS + 1)).toBe(true);
    });
  });
});
