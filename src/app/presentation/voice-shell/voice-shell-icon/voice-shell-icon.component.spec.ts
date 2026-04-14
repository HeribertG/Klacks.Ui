// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { VoiceShellIconComponent } from './voice-shell-icon.component';
import { VoiceShellClass } from 'src/app/domain/constants/voice-shell-constants';
import { ConversationState } from '../../aside/assistant-chat/services/conversation-orchestrator.service';

describe('VoiceShellIconComponent', () => {
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
});
