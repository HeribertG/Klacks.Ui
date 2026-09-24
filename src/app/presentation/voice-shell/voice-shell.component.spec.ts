// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { VoiceShellComponent } from './voice-shell.component';
import {
  ConversationOrchestratorService,
  ConversationState,
} from '../aside/assistant-chat/services/conversation-orchestrator.service';
import { TextToSpeechService } from '../aside/assistant-chat/services/text-to-speech.service';
import { AudioQueueService } from '../aside/assistant-chat/services/audio-queue.service';
import { ChatTurnControlService } from '../aside/assistant-chat/services/chat-turn-control.service';
import { AsideService } from '../aside/aside.service';
import type { IVoiceShellErrorHint } from 'src/app/domain/models/assistant/voice-shell-error-hint.model';
import type { ChatMessage } from '../aside/assistant-chat/chat-message.interface';
import { TranscriptOverlayService } from './transcript-overlay/transcript-overlay.service';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

interface MockOrchestrator {
  state: ReturnType<typeof signal<ConversationState>>;
  voiceModeEnabled: ReturnType<typeof signal<boolean>>;
  isTextProcessing: ReturnType<typeof signal<boolean>>;
  isPlanning: ReturnType<typeof signal<boolean>>;
  messages: ReturnType<typeof signal<readonly ChatMessage[]>>;
  errors$: Subject<IVoiceShellErrorHint>;
  startSession: ReturnType<typeof vi.fn>;
  endSession: ReturnType<typeof vi.fn>;
  interrupt: ReturnType<typeof vi.fn>;
  interruptAndListen: ReturnType<typeof vi.fn>;
  stopAutoSpeak: ReturnType<typeof vi.fn>;
}

function makeOrchestratorMock(): MockOrchestrator {
  return {
    state: signal<ConversationState>(ConversationState.Idle),
    voiceModeEnabled: signal<boolean>(false),
    isTextProcessing: signal<boolean>(false),
    isPlanning: signal<boolean>(false),
    messages: signal<readonly ChatMessage[]>([]),
    errors$: new Subject<IVoiceShellErrorHint>(),
    startSession: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn(),
    interrupt: vi.fn(),
    interruptAndListen: vi.fn(),
    stopAutoSpeak: vi.fn(),
  };
}

interface MockAudioQueue {
  isPlaying: ReturnType<typeof signal<boolean>>;
}

function makeAudioQueueMock(): MockAudioQueue {
  return { isPlaying: signal<boolean>(false) };
}

interface MockTurnControl {
  stop: ReturnType<typeof vi.fn>;
  cancelRunningExecutions: ReturnType<typeof vi.fn>;
  isExecuting: ReturnType<typeof signal<boolean>>;
}

function makeTurnControlMock(): MockTurnControl {
  return {
    stop: vi.fn(() => Promise.resolve()),
    cancelRunningExecutions: vi.fn(),
    isExecuting: signal<boolean>(false),
  };
}

interface MockTts {
  isPlaying: ReturnType<typeof signal<boolean>>;
  isLoading: ReturnType<typeof signal<boolean>>;
  stop: ReturnType<typeof vi.fn>;
}

function makeTtsMock(): MockTts {
  return {
    isPlaying: signal<boolean>(false),
    isLoading: signal<boolean>(false),
    stop: vi.fn(),
  };
}

describe('VoiceShellComponent — click matrix', () => {
  let fixture: ComponentFixture<VoiceShellComponent>;
  let component: VoiceShellComponent;
  let orch: MockOrchestrator;
  let tts: MockTts;
  let turnControl: MockTurnControl;
  let audioQueue: MockAudioQueue;

  beforeEach(() => {
    orch = makeOrchestratorMock();
    tts = makeTtsMock();
    turnControl = makeTurnControlMock();
    audioQueue = makeAudioQueueMock();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orch },
        { provide: TextToSpeechService, useValue: tts },
        { provide: ChatTurnControlService, useValue: turnControl },
        { provide: AudioQueueService, useValue: audioQueue },
        { provide: AsideService, useValue: { hide: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(VoiceShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('idle → click starts session via startSession', () => {
    orch.state.set(ConversationState.Idle);
    component.handleClick();
    expect(orch.startSession).toHaveBeenCalledOnce();
  });

  it('listening → click ends session via endSession', () => {
    orch.state.set(ConversationState.Listening);
    component.handleClick();
    expect(orch.endSession).toHaveBeenCalledOnce();
  });

  it('enhancing → click is ignored', () => {
    orch.state.set(ConversationState.Enhancing);
    component.handleClick();
    expect(orch.startSession).not.toHaveBeenCalled();
    expect(orch.endSession).not.toHaveBeenCalled();
    expect(orch.interruptAndListen).not.toHaveBeenCalled();
  });

  it('processing → click invokes endSession (which aborts SSE and returns to Idle; abort-controller side-effect covered in orchestrator spec)', () => {
    orch.state.set(ConversationState.Processing);
    component.handleClick();
    expect(orch.endSession).toHaveBeenCalledOnce();
    expect(orch.startSession).not.toHaveBeenCalled();
    expect(orch.interruptAndListen).not.toHaveBeenCalled();
  });

  it('speaking → click interrupts and returns to listening', () => {
    orch.state.set(ConversationState.Speaking);
    component.handleClick();
    expect(orch.interruptAndListen).toHaveBeenCalledOnce();
  });

  it('processing during a TEXT turn (orchestrator still Idle) → stops the turn, never startSession', () => {
    orch.state.set(ConversationState.Idle);
    orch.isTextProcessing.set(true);
    component.handleClick();

    expect(turnControl.stop).toHaveBeenCalledWith('voice-bubble');
    expect(orch.startSession).not.toHaveBeenCalled();
  });

  it('planning during a TEXT turn → stops the turn via voice-bubble', () => {
    orch.state.set(ConversationState.Idle);
    orch.isTextProcessing.set(true);
    orch.isPlanning.set(true);
    component.handleClick();

    expect(turnControl.stop).toHaveBeenCalledWith('voice-bubble');
  });

  it('processing during a REAL voice session → still ends the session, not turnControl.stop', () => {
    orch.state.set(ConversationState.Processing);
    component.handleClick();

    expect(orch.endSession).toHaveBeenCalledOnce();
    expect(turnControl.stop).not.toHaveBeenCalled();
  });

  it('TTS playing outside a voice session (state Idle) → still stops TTS directly, unaffected by the fix', () => {
    orch.state.set(ConversationState.Idle);
    tts.isPlaying.set(true);
    component.handleClick();

    expect(tts.stop).toHaveBeenCalledOnce();
    expect(turnControl.stop).not.toHaveBeenCalled();
  });

  it('TTS loading outside a voice session (state Idle, effectiveState Processing) → still stops TTS directly', () => {
    orch.state.set(ConversationState.Idle);
    tts.isLoading.set(true);
    component.handleClick();

    expect(tts.stop).toHaveBeenCalledOnce();
    expect(turnControl.stop).not.toHaveBeenCalled();
  });

  it('audioQueue auto-speak playing outside a voice session (state Idle) → stops auto-speak directly, not the turn', () => {
    orch.state.set(ConversationState.Idle);
    audioQueue.isPlaying.set(true);
    component.handleClick();

    expect(orch.stopAutoSpeak).toHaveBeenCalledOnce();
    expect(turnControl.stop).not.toHaveBeenCalled();
  });

  it('speaking during a real voice session → interruptAndListen with voice-bubble', () => {
    orch.state.set(ConversationState.Speaking);
    component.handleClick();

    expect(orch.interruptAndListen).toHaveBeenCalledWith('voice-bubble');
  });

  it('UI action still executing after Done (orchestrator Idle, turn finished) → cancels the execution, never startSession', () => {
    orch.state.set(ConversationState.Idle);
    turnControl.isExecuting.set(true);
    component.handleClick();

    expect(turnControl.cancelRunningExecutions).toHaveBeenCalledOnce();
    expect(orch.startSession).not.toHaveBeenCalled();
  });

  it('shows the bubble as processing while a UI action executes', () => {
    orch.state.set(ConversationState.Idle);
    expect(component.effectiveState()).toBe(ConversationState.Idle);

    turnControl.isExecuting.set(true);

    expect(component.effectiveState()).toBe(ConversationState.Processing);
  });

  it('after the execution ended a click starts a session again', () => {
    orch.state.set(ConversationState.Idle);
    turnControl.isExecuting.set(true);
    turnControl.isExecuting.set(false);
    component.handleClick();

    expect(turnControl.cancelRunningExecutions).not.toHaveBeenCalled();
    expect(orch.startSession).toHaveBeenCalledOnce();
  });

  it('processing during a TEXT turn → stops the turn and cancels a running execution', () => {
    orch.state.set(ConversationState.Idle);
    orch.isTextProcessing.set(true);
    component.handleClick();

    expect(turnControl.stop).toHaveBeenCalledWith('voice-bubble');
    expect(turnControl.cancelRunningExecutions).toHaveBeenCalledOnce();
  });

  it('TTS playing during a TEXT turn → stops only the speech and leaves a running execution alone', () => {
    orch.state.set(ConversationState.Idle);
    tts.isPlaying.set(true);
    turnControl.isExecuting.set(true);
    component.handleClick();

    expect(tts.stop).toHaveBeenCalledOnce();
    expect(turnControl.cancelRunningExecutions).not.toHaveBeenCalled();
  });

  it('auto-speak playing during a TEXT turn → stops only the speech and leaves a running execution alone', () => {
    orch.state.set(ConversationState.Idle);
    audioQueue.isPlaying.set(true);
    turnControl.isExecuting.set(true);
    component.handleClick();

    expect(orch.stopAutoSpeak).toHaveBeenCalledOnce();
    expect(turnControl.cancelRunningExecutions).not.toHaveBeenCalled();
  });

  it('idle without any execution → no cancel', () => {
    orch.state.set(ConversationState.Idle);
    component.handleClick();

    expect(turnControl.cancelRunningExecutions).not.toHaveBeenCalled();
  });
});

describe('VoiceShellComponent — error hint', () => {
  it('sets errorHint signal when orchestrator emits an error', () => {
    const orch = makeOrchestratorMock();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orch },
        { provide: TextToSpeechService, useValue: makeTtsMock() },
        { provide: ChatTurnControlService, useValue: makeTurnControlMock() },
        { provide: AsideService, useValue: { hide: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(VoiceShellComponent);
    fixture.detectChanges();
    orch.errors$.next({
      kind: 'stt-connection',
      i18nKey: 'klacksy.voice.errors.stt-failed',
      persistent: false,
    });
    expect(fixture.componentInstance.errorHint()?.kind).toBe('stt-connection');
  });

  it('auto-clears non-persistent error after 3000ms', () => {
    vi.useFakeTimers();
    const orch = makeOrchestratorMock();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orch },
        { provide: TextToSpeechService, useValue: makeTtsMock() },
        { provide: ChatTurnControlService, useValue: makeTurnControlMock() },
        { provide: AsideService, useValue: { hide: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(VoiceShellComponent);
    fixture.detectChanges();
    orch.errors$.next({ kind: 'network', i18nKey: 'x', persistent: false });
    expect(fixture.componentInstance.errorHint()).not.toBeNull();
    vi.advanceTimersByTime(3000);
    expect(fixture.componentInstance.errorHint()).toBeNull();
    vi.useRealTimers();
  });
});

describe('VoiceShellComponent — close button', () => {
  it('close button only rendered in idle state', () => {
    const orch = makeOrchestratorMock();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orch },
        { provide: TextToSpeechService, useValue: makeTtsMock() },
        { provide: ChatTurnControlService, useValue: makeTurnControlMock() },
        { provide: AsideService, useValue: { hide: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(VoiceShellComponent);
    orch.state.set(ConversationState.Idle);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.close-btn')).toBeTruthy();
    orch.state.set(ConversationState.Listening);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.close-btn')).toBeNull();
  });

  it('close button click calls asideService.hide()', () => {
    const orch = makeOrchestratorMock();
    const aside = { hide: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orch },
        { provide: TextToSpeechService, useValue: makeTtsMock() },
        { provide: ChatTurnControlService, useValue: makeTurnControlMock() },
        { provide: AsideService, useValue: aside },
      ],
    });
    const fixture = TestBed.createComponent(VoiceShellComponent);
    orch.state.set(ConversationState.Idle);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.close-btn')!.click();
    expect(aside.hide).toHaveBeenCalledOnce();
  });
});

describe('VoiceShellComponent — auto-play TTS (BothAuto)', () => {
  let fixture: ComponentFixture<VoiceShellComponent>;
  let component: VoiceShellComponent;
  let orch: MockOrchestrator;
  let tts: MockTts;

  beforeEach(() => {
    orch = makeOrchestratorMock();
    tts = makeTtsMock();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orch },
        { provide: TextToSpeechService, useValue: tts },
        { provide: ChatTurnControlService, useValue: makeTurnControlMock() },
        { provide: AsideService, useValue: { hide: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(VoiceShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('idle + tts playing → effectiveState is Speaking', () => {
    orch.state.set(ConversationState.Idle);
    tts.isPlaying.set(true);
    expect(component.effectiveState()).toBe(ConversationState.Speaking);
  });

  it('idle + tts loading → effectiveState is Processing', () => {
    orch.state.set(ConversationState.Idle);
    tts.isLoading.set(true);
    expect(component.effectiveState()).toBe(ConversationState.Processing);
  });

  it('idle without tts activity → effectiveState is Idle', () => {
    orch.state.set(ConversationState.Idle);
    expect(component.effectiveState()).toBe(ConversationState.Idle);
  });

  it('orchestrator state takes precedence over tts playing', () => {
    orch.state.set(ConversationState.Listening);
    tts.isPlaying.set(true);
    expect(component.effectiveState()).toBe(ConversationState.Listening);
  });

  it('processing + planning → effectiveState is Planning', () => {
    orch.state.set(ConversationState.Processing);
    orch.isPlanning.set(true);
    expect(component.effectiveState()).toBe(ConversationState.Planning);
  });

  it('idle text-processing + planning → effectiveState is Planning', () => {
    orch.state.set(ConversationState.Idle);
    orch.isTextProcessing.set(true);
    orch.isPlanning.set(true);
    expect(component.effectiveState()).toBe(ConversationState.Planning);
  });

  it('planning never overrides an active Speaking playback', () => {
    orch.state.set(ConversationState.Speaking);
    orch.isPlanning.set(true);
    expect(component.effectiveState()).toBe(ConversationState.Speaking);
  });

  it('idle + tts playing wins over a stray planning flag', () => {
    orch.state.set(ConversationState.Idle);
    orch.isPlanning.set(true);
    tts.isPlaying.set(true);
    expect(component.effectiveState()).toBe(ConversationState.Speaking);
  });

  it('idle click while tts playing stops playback instead of starting a session', () => {
    orch.state.set(ConversationState.Idle);
    tts.isPlaying.set(true);
    component.handleClick();
    expect(tts.stop).toHaveBeenCalledOnce();
    expect(orch.startSession).not.toHaveBeenCalled();
  });

  it('idle click while tts loading stops playback instead of starting a session', () => {
    orch.state.set(ConversationState.Idle);
    tts.isLoading.set(true);
    component.handleClick();
    expect(tts.stop).toHaveBeenCalledOnce();
    expect(orch.startSession).not.toHaveBeenCalled();
  });
});

describe('VoiceShellComponent — long press', () => {
  let fixture: ComponentFixture<VoiceShellComponent>;
  let orch: MockOrchestrator;
  let shell: HTMLElement;
  let showTranscript: ReturnType<typeof vi.spyOn>;

  const touchPointer = (type: string, init: PointerEventInit = {}): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: 5,
      pointerType: 'touch',
      clientX: 20,
      clientY: 20,
      ...init,
    });

  beforeEach(() => {
    vi.useFakeTimers();
    orch = makeOrchestratorMock();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orch },
        { provide: TextToSpeechService, useValue: makeTtsMock() },
        { provide: ChatTurnControlService, useValue: makeTurnControlMock() },
        { provide: AudioQueueService, useValue: makeAudioQueueMock() },
        { provide: AsideService, useValue: { hide: vi.fn() } },
      ],
    });
    showTranscript = vi.spyOn(TestBed.inject(TranscriptOverlayService), 'show');
    fixture = TestBed.createComponent(VoiceShellComponent);
    fixture.detectChanges();
    shell = fixture.nativeElement.querySelector('.voice-shell');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the transcript once after a held touch', () => {
    shell.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    document.dispatchEvent(touchPointer('pointerup'));

    expect(showTranscript).toHaveBeenCalledTimes(1);
  });

  it('does not open the transcript when the finger moves beyond the tolerance before the hold completes', () => {
    shell.dispatchEvent(touchPointer('pointerdown'));
    document.dispatchEvent(
      touchPointer('pointermove', { clientX: 20 + TouchInteraction.MoveTolerancePx + 5 }),
    );
    vi.advanceTimersByTime(TouchInteraction.LongPressMs * 2);

    expect(showTranscript).not.toHaveBeenCalled();
  });

  it('does not start a voice session from the click that follows a long press', () => {
    shell.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs);
    document.dispatchEvent(touchPointer('pointerup'));

    shell.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(orch.startSession).not.toHaveBeenCalled();
  });

  it('still starts a voice session from a plain tap', () => {
    shell.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs / 5);
    document.dispatchEvent(touchPointer('pointerup'));

    shell.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(orch.startSession).toHaveBeenCalledOnce();
    expect(showTranscript).not.toHaveBeenCalled();
  });

  it('opens the transcript exactly once when the browser emits its own contextmenu during the hold', () => {
    shell.dispatchEvent(touchPointer('pointerdown'));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs / 2);

    shell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
    vi.advanceTimersByTime(TouchInteraction.LongPressMs * 2);
    document.dispatchEvent(touchPointer('pointerup'));

    expect(showTranscript).toHaveBeenCalledTimes(1);
  });

  it('keeps the mouse right-click path', () => {
    shell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));

    expect(showTranscript).toHaveBeenCalledTimes(1);
  });
});
