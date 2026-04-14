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
import { AsideService } from '../aside/aside.service';
import type { IVoiceShellErrorHint } from 'src/app/domain/models/assistant/voice-shell-error-hint.model';
import type { ChatMessage } from '../aside/assistant-chat/chat-message.interface';

interface MockOrchestrator {
  state: ReturnType<typeof signal<ConversationState>>;
  voiceModeEnabled: ReturnType<typeof signal<boolean>>;
  messages: ReturnType<typeof signal<ReadonlyArray<ChatMessage>>>;
  errors$: Subject<IVoiceShellErrorHint>;
  startSession: ReturnType<typeof vi.fn>;
  endSession: ReturnType<typeof vi.fn>;
  interruptAndListen: ReturnType<typeof vi.fn>;
}

function makeOrchestratorMock(): MockOrchestrator {
  return {
    state: signal<ConversationState>(ConversationState.Idle),
    voiceModeEnabled: signal<boolean>(false),
    messages: signal<ReadonlyArray<ChatMessage>>([]),
    errors$: new Subject<IVoiceShellErrorHint>(),
    startSession: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn(),
    interruptAndListen: vi.fn(),
  };
}

describe('VoiceShellComponent — click matrix', () => {
  let fixture: ComponentFixture<VoiceShellComponent>;
  let component: VoiceShellComponent;
  let orch: MockOrchestrator;

  beforeEach(() => {
    orch = makeOrchestratorMock();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orch },
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
});

describe('VoiceShellComponent — error hint', () => {
  it('sets errorHint signal when orchestrator emits an error', () => {
    const orch = makeOrchestratorMock();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: orch },
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
