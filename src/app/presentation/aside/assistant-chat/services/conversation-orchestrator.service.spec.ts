// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for ConversationOrchestratorService state machine.
 */
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { ConversationOrchestratorService, ConversationState } from './conversation-orchestrator.service';
import { AudioCaptureService } from 'src/app/infrastructure/services/speech/audio-capture.service';
import { SttStreamService } from 'src/app/infrastructure/api/assistant/data-stt-stream.service';
import { DataTranscriptionService } from 'src/app/infrastructure/api/assistant/data-transcription.service';
import { AudioQueueService } from './audio-queue.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

describe('ConversationOrchestratorService', () => {
  let service: ConversationOrchestratorService;

  beforeEach(() => {
    const audioCaptureSpy = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      setSilenceThresholdMs: vi.fn(),
      isCapturing: vi.fn(() => false),
      audioChunk$: new Subject(),
      silenceDetected$: new Subject(),
      speechStarted$: new Subject(),
    };

    const sttStreamSpy = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      isConnected: vi.fn(() => false),
      transcript$: new Subject(),
      error$: new Subject(),
    };

    const transcriptionSpy = {
      enhance: vi.fn().mockResolvedValue('enhanced'),
    };

    const audioQueueSpy = {
      enqueue: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn(() => false),
      queueLength: vi.fn(() => 0),
      playbackFinished$: new Subject(),
    };

    const settingsSpy = {
      speechSettings: vi.fn(() => ({
        sttEngine: 'browser',
        sttApiKey: '',
        ttsVoice: 'auto',
        ttsProvider: 'edge',
        transcriptionModel: 'deepseek-chat',
        enhancementEnabled: true,
        outputMode: 'both',
        silenceThresholdMs: 1500,
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        ConversationOrchestratorService,
        { provide: AudioCaptureService, useValue: audioCaptureSpy },
        { provide: SttStreamService, useValue: sttStreamSpy },
        { provide: DataTranscriptionService, useValue: transcriptionSpy },
        { provide: AudioQueueService, useValue: audioQueueSpy },
        { provide: AppSettingsManagementService, useValue: settingsSpy },
      ],
    });
    service = TestBed.inject(ConversationOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start in IDLE state', () => {
    expect(service.state()).toBe(ConversationState.Idle);
  });

  it('should have voice mode disabled initially', () => {
    expect(service.voiceModeEnabled()).toBe(false);
  });

  it('should have empty interim text initially', () => {
    expect(service.interimText()).toBe('');
  });

  it('should ignore interrupt when in IDLE state', () => {
    expect(() => service.interrupt()).not.toThrow();
    expect(service.state()).toBe(ConversationState.Idle);
  });
});
