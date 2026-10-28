// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { VoiceShellInputComponent } from './voice-shell-input.component';
import { ConversationOrchestratorService } from '../../aside/assistant-chat/services/conversation-orchestrator.service';
import { TextToSpeechService } from '../../aside/assistant-chat/services/text-to-speech.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { PLAYGROUND_MAX_PROMPT_CHARS } from 'src/app/domain/constants/playground.constants';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { PlaygroundPromptGateService } from 'src/app/domain/services/playground/playground-prompt-gate.service';
import { PlaygroundStatusGateService } from 'src/app/domain/services/playground/playground-status-gate.service';
import { ToastShowService } from '../../toast/toast-show.service';

describe('VoiceShellInputComponent', () => {
  let fixture: ComponentFixture<VoiceShellInputComponent>;
  let component: VoiceShellInputComponent;
  let orchestrator: { submitText: ReturnType<typeof vi.fn> };
  let tts: { interrupt: ReturnType<typeof vi.fn> };
  let toasts: { showInfo: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    orchestrator = { submitText: vi.fn().mockResolvedValue(undefined) };
    tts = { interrupt: vi.fn() };
    toasts = { showInfo: vi.fn(), showError: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ConversationOrchestratorService, useValue: orchestrator },
        { provide: TextToSpeechService, useValue: tts },
        { provide: ToastShowService, useValue: toasts },
        {
          provide: DataManagementAssistantService,
          useValue: { modelsInitialized: signal(true) },
        },
        {
          provide: DataManagementAssistantProviderService,
          useValue: {
            providersInitialized: signal(true),
            getCurrentProviders: vi.fn().mockReturnValue([{ hasApiKey: true }]),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(VoiceShellInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sends the trimmed text via orchestrator.submitText and clears the input', async () => {
    component.inputText.set('  Hallo Klacksy  ');
    await component.send();
    expect(orchestrator.submitText).toHaveBeenCalledWith('Hallo Klacksy');
    expect(component.inputText()).toBe('');
  });

  it('does not send empty input', async () => {
    component.inputText.set('   ');
    await component.send();
    expect(orchestrator.submitText).not.toHaveBeenCalled();
  });

  it('typing a printable key interrupts a running TTS playback (barge-in)', () => {
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(tts.interrupt).toHaveBeenCalledOnce();
  });

  it('modifier shortcuts do not interrupt TTS playback', () => {
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    expect(tts.interrupt).not.toHaveBeenCalled();
  });

  it('enter interrupts TTS and sends the message', async () => {
    component.inputText.set('Neue Frage');
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(tts.interrupt).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(orchestrator.submitText).toHaveBeenCalledWith('Neue Frage'));
  });

  describe('playground limit', () => {
    const activateLimit = (): void => {
      TestBed.inject(PlaygroundDeviceService).applyStatus({ limitActive: true, deviceToken: 'token' });
      fixture.detectChanges();
    };

    afterEach(() => {
      localStorage.removeItem(StorageKeys.PLAYGROUND_DEVICE_TOKEN);
      localStorage.removeItem(StorageKeys.PLAYGROUND_NOTICE_ACKNOWLEDGED);
    });

    it('sets no maxlength and shows no notice while the limit is inactive', () => {
      const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

      expect(textarea.hasAttribute('maxlength')).toBe(false);
      expect(fixture.nativeElement.querySelector('app-playground-notice .playground-notice')).toBeNull();
    });

    it('keeps the text and sends nothing until the notice is confirmed', async () => {
      activateLimit();
      component.inputText.set('Hallo');

      await component.send();

      expect(orchestrator.submitText).not.toHaveBeenCalled();
      expect(component.inputText()).toBe('Hallo');
      expect(component.isSendBlocked()).toBe(true);
    });

    it('waits for the status before it decides and then asks for the confirmation', async () => {
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      statusGate.begin();
      component.inputText.set('Hallo');

      const sending = component.send();
      await Promise.resolve();
      expect(orchestrator.submitText).not.toHaveBeenCalled();
      activateLimit();
      statusGate.end();
      await sending;

      expect(orchestrator.submitText).not.toHaveBeenCalled();
      expect(component.inputText()).toBe('Hallo');
    });

    it('waits for the status and sends once it turned out inactive', async () => {
      const statusGate = TestBed.inject(PlaygroundStatusGateService);
      statusGate.begin();
      component.inputText.set('Hallo');

      const sending = component.send();
      await Promise.resolve();
      expect(orchestrator.submitText).not.toHaveBeenCalled();
      statusGate.end();
      await sending;

      expect(orchestrator.submitText).toHaveBeenCalledWith('Hallo');
    });

    it('sends after the notice is confirmed', async () => {
      activateLimit();
      TestBed.inject(PlaygroundPromptGateService).acknowledge();
      component.inputText.set('Hallo');

      await component.send();

      expect(orchestrator.submitText).toHaveBeenCalledWith('Hallo');
    });

    it('limits the input to the maximum prompt length and refuses a longer text', async () => {
      activateLimit();
      TestBed.inject(PlaygroundPromptGateService).acknowledge();
      const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
      component.inputText.set('x'.repeat(PLAYGROUND_MAX_PROMPT_CHARS + 1));

      await component.send();

      expect(textarea.getAttribute('maxlength')).toBe(String(PLAYGROUND_MAX_PROMPT_CHARS));
      expect(orchestrator.submitText).not.toHaveBeenCalled();
      expect(toasts.showError).toHaveBeenCalled();
    });
  });
});
