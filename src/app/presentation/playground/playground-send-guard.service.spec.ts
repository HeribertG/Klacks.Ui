// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { PLAYGROUND_MAX_PROMPT_CHARS } from 'src/app/domain/constants/playground.constants';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { PlaygroundPromptGateService } from 'src/app/domain/services/playground/playground-prompt-gate.service';
import { PlaygroundStatusGateService } from 'src/app/domain/services/playground/playground-status-gate.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { PlaygroundSendGuardService } from './playground-send-guard.service';

describe('PlaygroundSendGuardService', () => {
  let service: PlaygroundSendGuardService;
  let toasts: { showInfo: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  const activateLimit = (): void =>
    TestBed.inject(PlaygroundDeviceService).applyStatus({ limitActive: true, deviceToken: 'token' });

  beforeEach(() => {
    toasts = { showInfo: vi.fn(), showError: vi.fn() };
    storage = { get: vi.fn(() => null), set: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ToastShowService, useValue: toasts },
        { provide: LocalStorageService, useValue: storage },
      ],
    });
    service = TestBed.inject(PlaygroundSendGuardService);
  });

  it('allows any prompt and shows nothing while the limit is inactive', () => {
    expect(service.allowSend('x'.repeat(PLAYGROUND_MAX_PROMPT_CHARS * 3))).toBe(true);
    expect(toasts.showInfo).not.toHaveBeenCalled();
    expect(toasts.showError).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('blocks and explains while the notice is not confirmed', () => {
    activateLimit();
    storage.set.mockClear();

    expect(service.allowSend('Hello')).toBe(false);
    expect(toasts.showInfo).toHaveBeenCalledOnce();
  });

  it('allows a prompt of exactly the maximum length after the confirmation', () => {
    activateLimit();
    TestBed.inject(PlaygroundPromptGateService).acknowledge();

    expect(service.allowSend('x'.repeat(PLAYGROUND_MAX_PROMPT_CHARS))).toBe(true);
  });

  it('blocks and explains a prompt that is one character too long', () => {
    activateLimit();
    TestBed.inject(PlaygroundPromptGateService).acknowledge();

    expect(service.allowSend('x'.repeat(PLAYGROUND_MAX_PROMPT_CHARS + 1))).toBe(false);
    expect(toasts.showError).toHaveBeenCalledOnce();
  });

  describe('allowSendWhenReady', () => {
    it('waits for the status and then applies the limit that the answer revealed', async () => {
      // Arrange
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      statusGate.begin();
      const verdict = service.allowSendWhenReady(() => 'Hello');
      await Promise.resolve();
      expect(toasts.showInfo).not.toHaveBeenCalled();

      // Act
      activateLimit();
      statusGate.end();

      // Assert
      await expect(verdict).resolves.toBe(false);
      expect(toasts.showInfo).toHaveBeenCalledOnce();
    });

    it('allows the send without any toast or storage write when the status turned out inactive', async () => {
      // Arrange
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      statusGate.begin();
      const verdict = service.allowSendWhenReady(() => 'Hello');

      // Act
      statusGate.end();

      // Assert
      await expect(verdict).resolves.toBe(true);
      expect(toasts.showInfo).not.toHaveBeenCalled();
      expect(toasts.showError).not.toHaveBeenCalled();
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('reads the prompt only after the wait and refuses it when it was sent meanwhile', async () => {
      // Arrange
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      let text = 'Hello';
      statusGate.begin();
      const verdict = service.allowSendWhenReady(() => text);

      // Act
      text = '';
      statusGate.end();

      // Assert
      await expect(verdict).resolves.toBe(false);
    });

    it('lets a second concurrent attempt fall through so a double Enter sends once', async () => {
      // Arrange
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      statusGate.begin();
      const first = service.allowSendWhenReady(() => 'Hello');

      // Act
      const second = await service.allowSendWhenReady(() => 'Hello');
      statusGate.end();

      // Assert
      expect(second).toBe(false);
      await expect(first).resolves.toBe(true);
    });
  });
});
