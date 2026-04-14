// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for ConversationOrchestratorService state machine.
 */
import { Component, inject } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { ConversationOrchestratorService, ConversationState, ConversationCallbacks } from './conversation-orchestrator.service';
import { AudioCaptureService } from 'src/app/infrastructure/services/speech/audio-capture.service';
import { SttStreamService } from 'src/app/infrastructure/api/assistant/data-stt-stream.service';
import { DataTranscriptionService } from 'src/app/infrastructure/api/assistant/data-transcription.service';
import { DataTtsService } from 'src/app/infrastructure/api/assistant/data-tts.service';
import { AudioQueueService } from './audio-queue.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('ConversationOrchestratorService', () => {
  let service: ConversationOrchestratorService;
  let mockAudioCapture: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    setSilenceThresholdMs: ReturnType<typeof vi.fn>;
    isCapturing: ReturnType<typeof vi.fn>;
    audioChunk$: Subject<ArrayBuffer>;
    silenceDetected$: Subject<void>;
    speechStarted$: Subject<void>;
  };
  let mockSttStream: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    sendAudio: ReturnType<typeof vi.fn>;
    isConnected: ReturnType<typeof vi.fn>;
    transcript$: Subject<{ text: string; isFinal: boolean }>;
    error$: Subject<Error>;
  };
  let mockTranscription: { enhance: ReturnType<typeof vi.fn> };
  let mockDataTts: { synthesize: ReturnType<typeof vi.fn> };
  let mockAudioQueue: {
    enqueue: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    isPlaying: ReturnType<typeof vi.fn>;
    queueLength: ReturnType<typeof vi.fn>;
    playbackFinished$: Subject<void>;
  };

  interface ISpeechSettings {
    sttEngine: string;
    sttApiKey: string;
    ttsVoice: string;
    ttsProvider: string;
    transcriptionModel: string;
    enhancementEnabled: boolean;
    outputMode: string;
    silenceThresholdMs: number;
  }

  let currentSettings: ISpeechSettings;

  beforeEach(() => {
    currentSettings = {
      sttEngine: 'browser',
      sttApiKey: '',
      ttsVoice: 'auto',
      ttsProvider: 'edge',
      transcriptionModel: 'deepseek-chat',
      enhancementEnabled: true,
      outputMode: 'both',
      silenceThresholdMs: 1500,
    };

    mockAudioCapture = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      setSilenceThresholdMs: vi.fn(),
      isCapturing: vi.fn(() => false),
      audioChunk$: new Subject(),
      silenceDetected$: new Subject(),
      speechStarted$: new Subject(),
    };

    mockSttStream = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      isConnected: vi.fn(() => false),
      transcript$: new Subject(),
      error$: new Subject(),
    };

    mockTranscription = {
      enhance: vi.fn().mockResolvedValue('enhanced'),
    };

    mockDataTts = {
      synthesize: vi.fn().mockResolvedValue(new Blob()),
    };

    mockAudioQueue = {
      enqueue: vi.fn(),
      stop: vi.fn(),
      isPlaying: vi.fn(() => false),
      queueLength: vi.fn(() => 0),
      playbackFinished$: new Subject(),
    };

    TestBed.configureTestingModule({
      providers: [
        ConversationOrchestratorService,
        { provide: AudioCaptureService, useValue: mockAudioCapture },
        { provide: SttStreamService, useValue: mockSttStream },
        { provide: DataTranscriptionService, useValue: mockTranscription },
        { provide: DataTtsService, useValue: mockDataTts },
        { provide: AudioQueueService, useValue: mockAudioQueue },
        { provide: AppSettingsManagementService, useValue: { speechSettings: vi.fn(() => currentSettings) } },
      ],
    });
    service = TestBed.inject(ConversationOrchestratorService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Existing smoke tests ---

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

  // --- State transition tests ---

  it('Test 1: IDLE → LISTENING on toggleVoiceMode', async () => {
    await service.toggleVoiceMode();

    expect(service.state()).toBe(ConversationState.Listening);
    expect(service.voiceModeEnabled()).toBe(true);
    expect(mockAudioCapture.start).toHaveBeenCalled();
  });

  it('Test 2: LISTENING → ENHANCING → PROCESSING on silence detection', async () => {
    let inputText = 'hello';
    const callbacks: ConversationCallbacks = {
      getInputText: () => inputText,
      setInputText: (text: string) => { inputText = text; },
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getAbortController: () => null,
      detectChanges: vi.fn(),
    };

    service.initialize(callbacks, 'de');
    await service.toggleVoiceMode();

    mockAudioCapture.silenceDetected$.next();
    await flushPromises();

    expect(mockTranscription.enhance).toHaveBeenCalledWith('hello', 'de');
    expect(callbacks.sendMessage).toHaveBeenCalled();
  });

  it('Test 3: LISTENING stays LISTENING on silence when input is empty', async () => {
    const callbacks: ConversationCallbacks = {
      getInputText: () => '',
      setInputText: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getAbortController: () => null,
      detectChanges: vi.fn(),
    };

    service.initialize(callbacks, 'de');
    await service.toggleVoiceMode();

    mockAudioCapture.silenceDetected$.next();
    await flushPromises();

    expect(service.state()).toBe(ConversationState.Listening);
    expect(mockTranscription.enhance).not.toHaveBeenCalled();
    expect(callbacks.sendMessage).not.toHaveBeenCalled();
  });

  it('Test 4: Enhancement skipped when enhancementEnabled is false', async () => {
    currentSettings = { ...currentSettings, enhancementEnabled: false };

    let inputText = 'hello';
    const callbacks: ConversationCallbacks = {
      getInputText: () => inputText,
      setInputText: (text: string) => { inputText = text; },
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getAbortController: () => null,
      detectChanges: vi.fn(),
    };

    service.initialize(callbacks, 'de');
    await service.toggleVoiceMode();

    mockAudioCapture.silenceDetected$.next();
    await flushPromises();

    expect(mockTranscription.enhance).not.toHaveBeenCalled();
    expect(callbacks.sendMessage).toHaveBeenCalled();
    expect(service.state()).toBe(ConversationState.Processing);
  });

  it('Test 5: PROCESSING → SPEAKING on first sentence', async () => {
    let inputText = 'hello';
    const callbacks: ConversationCallbacks = {
      getInputText: () => inputText,
      setInputText: (text: string) => { inputText = text; },
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getAbortController: () => null,
      detectChanges: vi.fn(),
    };

    service.initialize(callbacks, 'de');
    await service.toggleVoiceMode();

    mockAudioCapture.silenceDetected$.next();
    await flushPromises();

    service.onStreamContent('Hello world. This is Klacksy.');

    expect(service.state()).toBe(ConversationState.Speaking);
    await flushPromises();
    expect(mockAudioQueue.enqueue).toHaveBeenCalled();
  });

  it('Test 6: SPEAKING → LISTENING when playback finishes and no pending sentences', async () => {
    let inputText = 'hello';
    const callbacks: ConversationCallbacks = {
      getInputText: () => inputText,
      setInputText: (text: string) => { inputText = text; },
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getAbortController: () => null,
      detectChanges: vi.fn(),
    };

    service.initialize(callbacks, 'de');
    await service.toggleVoiceMode();

    mockAudioCapture.silenceDetected$.next();
    await flushPromises();

    service.onStreamContent('Hi there.');
    await flushPromises();

    service.onStreamDone();
    await flushPromises();

    mockAudioQueue.playbackFinished$.next();
    await flushPromises();

    expect(service.state()).toBe(ConversationState.Listening);
  });

  it('Test 7: Interrupt during SPEAKING → LISTENING, audio queue stopped', async () => {
    let inputText = 'hello';
    const callbacks: ConversationCallbacks = {
      getInputText: () => inputText,
      setInputText: (text: string) => { inputText = text; },
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getAbortController: () => null,
      detectChanges: vi.fn(),
    };

    service.initialize(callbacks, 'de');
    await service.toggleVoiceMode();

    mockAudioCapture.silenceDetected$.next();
    await flushPromises();

    service.onStreamContent('Hello world. This is Klacksy.');
    expect(service.state()).toBe(ConversationState.Speaking);

    service.interrupt();

    expect(mockAudioQueue.stop).toHaveBeenCalled();
    expect(service.state()).toBe(ConversationState.Listening);
  });

  it('Test 8: Interrupt during IDLE does nothing', () => {
    service.interrupt();

    expect(service.state()).toBe(ConversationState.Idle);
    expect(mockAudioQueue.stop).not.toHaveBeenCalled();
  });

  it('Test 9: OutputMode text does not synthesize TTS, transitions to LISTENING on onStreamDone', async () => {
    currentSettings = { ...currentSettings, outputMode: 'text' };

    let inputText = 'hello';
    const callbacks: ConversationCallbacks = {
      getInputText: () => inputText,
      setInputText: (text: string) => { inputText = text; },
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getAbortController: () => null,
      detectChanges: vi.fn(),
    };

    service.initialize(callbacks, 'de');
    await service.toggleVoiceMode();

    mockAudioCapture.silenceDetected$.next();
    await flushPromises();

    service.onStreamContent('Hello.');

    expect(mockAudioQueue.enqueue).not.toHaveBeenCalled();

    service.onStreamDone();
    await flushPromises();

    expect(service.state()).toBe(ConversationState.Listening);
  });

  it('Test 10: Sentence extraction across multiple content chunks', async () => {
    let inputText = 'hello';
    const callbacks: ConversationCallbacks = {
      getInputText: () => inputText,
      setInputText: (text: string) => { inputText = text; },
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getAbortController: () => null,
      detectChanges: vi.fn(),
    };

    service.initialize(callbacks, 'de');
    await service.toggleVoiceMode();

    mockAudioCapture.silenceDetected$.next();
    await flushPromises();

    service.onStreamContent('Hel');
    service.onStreamContent('lo world. How');
    service.onStreamContent(' are you?');

    await flushPromises();

    expect(mockAudioQueue.enqueue).toHaveBeenCalledTimes(2);
  });

  it('Test 11: disable (voiceModeEnabled=true → false) resets state to IDLE', async () => {
    const callbacks: ConversationCallbacks = {
      getInputText: () => '',
      setInputText: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getAbortController: () => null,
      detectChanges: vi.fn(),
    };

    service.initialize(callbacks, 'de');
    await service.toggleVoiceMode();

    expect(service.voiceModeEnabled()).toBe(true);
    expect(service.state()).toBe(ConversationState.Listening);

    await service.toggleVoiceMode();

    expect(service.voiceModeEnabled()).toBe(false);
    expect(service.state()).toBe(ConversationState.Idle);
    expect(service.interimText()).toBe('');
    expect(mockAudioCapture.stop).toHaveBeenCalled();
    expect(mockSttStream.disconnect).toHaveBeenCalled();
  });
});

@Component({ standalone: true, template: '' })
class HostHarnessComponent {
  readonly orchestrator = inject(ConversationOrchestratorService);
}

describe('ConversationOrchestratorService — root provider guarantee', () => {
  it('state survives host-component destroy (root singleton invariant)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostHarnessComponent] });

    const firstInstance = TestBed.inject(ConversationOrchestratorService);
    const fixture: ComponentFixture<HostHarnessComponent> = TestBed.createComponent(HostHarnessComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.orchestrator).toBe(firstInstance);

    const before = firstInstance.state();

    fixture.destroy();

    const secondInstance = TestBed.inject(ConversationOrchestratorService);
    expect(secondInstance).toBe(firstInstance);
    expect(secondInstance.state()).toBe(before);
  });
});
