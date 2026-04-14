// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { VoiceShellIconComponent } from './voice-shell-icon.component';
import { VoiceShellClass } from 'src/app/domain/constants/voice-shell-constants';

describe('VoiceShellIconComponent', () => {
  it('applies state-idle class when state is idle', () => {
    const fixture = TestBed.createComponent(VoiceShellIconComponent);
    fixture.componentRef.setInput('state', 'idle');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector(`.${VoiceShellClass.StateIdle}`)).toBeTruthy();
  });

  it('renders wave-bars when state is speaking', () => {
    const fixture = TestBed.createComponent(VoiceShellIconComponent);
    fixture.componentRef.setInput('state', 'speaking');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelectorAll('.wave-bar').length).toBe(5);
  });

  it('applies state-listening class and pulse-ring element when listening', () => {
    const fixture = TestBed.createComponent(VoiceShellIconComponent);
    fixture.componentRef.setInput('state', 'listening');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector(`.${VoiceShellClass.StateListening}`)).toBeTruthy();
    expect(host.querySelector('.pulse-ring')).toBeTruthy();
  });
});
