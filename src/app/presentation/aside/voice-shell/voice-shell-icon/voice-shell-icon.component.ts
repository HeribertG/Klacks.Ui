// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Presentational icon for the Klacksy voice-only shell.
 * Renders a state-coloured SVG with animation driven purely by CSS classes.
 * @param state - current 5-state orchestrator state ('idle' | 'listening' | 'enhancing' | 'processing' | 'speaking')
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceShellClass } from 'src/app/domain/constants/voice-shell-constants';

type OrchestratorState = 'idle' | 'listening' | 'enhancing' | 'processing' | 'speaking';

@Component({
  selector: 'app-voice-shell-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-shell-icon.component.html',
  styleUrl: './voice-shell-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceShellIconComponent {
  readonly state = input.required<OrchestratorState>();

  readonly stateClass = computed<string>(() => {
    switch (this.state()) {
      case 'idle': return VoiceShellClass.StateIdle;
      case 'listening': return VoiceShellClass.StateListening;
      case 'enhancing': return VoiceShellClass.StateEnhancing;
      case 'processing': return VoiceShellClass.StateProcessing;
      case 'speaking': return VoiceShellClass.StateSpeaking;
    }
  });

  readonly waveBars: ReadonlyArray<number> = [0, 1, 2, 3, 4];
  readonly isListening = computed(() => this.state() === 'listening');
  readonly isSpeaking = computed(() => this.state() === 'speaking');
  readonly isSpinning = computed(() => {
    const s = this.state();
    return s === 'enhancing' || s === 'processing';
  });
}
