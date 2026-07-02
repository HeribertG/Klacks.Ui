// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { VoiceShellInputComponent } from './voice-shell-input.component';
import { ConversationOrchestratorService } from '../../aside/assistant-chat/services/conversation-orchestrator.service';
import { TextToSpeechService } from '../../aside/assistant-chat/services/text-to-speech.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';

describe('VoiceShellInputComponent', () => {
  let fixture: ComponentFixture<VoiceShellInputComponent>;
  let component: VoiceShellInputComponent;
  let orchestrator: { submitText: ReturnType<typeof vi.fn> };
  let tts: { interrupt: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    orchestrator = { submitText: vi.fn().mockResolvedValue(undefined) };
    tts = { interrupt: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orchestrator },
        { provide: TextToSpeechService, useValue: tts },
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

  it('enter interrupts TTS and sends the message', () => {
    component.inputText.set('Neue Frage');
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(tts.interrupt).toHaveBeenCalledOnce();
    expect(orchestrator.submitText).toHaveBeenCalledWith('Neue Frage');
  });
});
