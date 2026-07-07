// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { TranslateModule } from '@ngx-translate/core';
import { VoiceShellIconComponent } from './voice-shell-icon.component';
import { VoiceShellClass } from 'src/app/domain/constants/voice-shell-constants';
import { ConversationState } from '../../aside/assistant-chat/services/conversation-orchestrator.service';

describe('VoiceShellIconComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VoiceShellIconComponent, TranslateModule.forRoot()],
    });
  });

  it('applies state-idle class when state is Idle', () => {
    const fixture = TestBed.createComponent(VoiceShellIconComponent);
    fixture.componentRef.setInput('state', ConversationState.Idle);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector(`.${VoiceShellClass.StateIdle}`)).toBeTruthy();
  });

  it('renders wave-bars when state is Speaking', () => {
    const fixture = TestBed.createComponent(VoiceShellIconComponent);
    fixture.componentRef.setInput('state', ConversationState.Speaking);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelectorAll('.wave-bar').length).toBe(5);
  });

  it('applies state-listening class and pulse-ring element when Listening', () => {
    const fixture = TestBed.createComponent(VoiceShellIconComponent);
    fixture.componentRef.setInput('state', ConversationState.Listening);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector(`.${VoiceShellClass.StateListening}`)).toBeTruthy();
    expect(host.querySelector('.pulse-ring')).toBeTruthy();
  });

  it('renders transcribe icon with waveform + text lines when Enhancing', () => {
    const fixture = TestBed.createComponent(VoiceShellIconComponent);
    fixture.componentRef.setInput('state', ConversationState.Enhancing);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector(`.${VoiceShellClass.StateEnhancing}`)).toBeTruthy();
    expect(host.querySelector('.transcribe-icon')).toBeTruthy();
    expect(host.querySelectorAll('.transcribe-icon .tx-bar').length).toBe(3);
    expect(host.querySelectorAll('.transcribe-icon .tx-line').length).toBe(3);
  });

  it('renders thinking dots when Processing', () => {
    const fixture = TestBed.createComponent(VoiceShellIconComponent);
    fixture.componentRef.setInput('state', ConversationState.Processing);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector(`.${VoiceShellClass.StateProcessing}`)).toBeTruthy();
    expect(host.querySelector('.thinking-dots')).toBeTruthy();
    expect(host.querySelectorAll('.thinking-dots .dot').length).toBe(3);
  });

  it('renders planning orbit spinner when Planning', () => {
    const fixture = TestBed.createComponent(VoiceShellIconComponent);
    fixture.componentRef.setInput('state', ConversationState.Planning);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector(`.${VoiceShellClass.StatePlanning}`)).toBeTruthy();
    expect(host.querySelector('.planning-orbit')).toBeTruthy();
    expect(host.querySelector('.planning-orbit .orbit-track')).toBeTruthy();
    expect(host.querySelector('.thinking-dots')).toBeFalsy();
  });
});
