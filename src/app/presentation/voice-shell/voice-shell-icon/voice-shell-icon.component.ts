// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Presentational icon for the Klacksy voice-only shell.
 * Renders a state-coloured SVG with animation driven purely by CSS classes.
 * @param state - current 5-state orchestrator state (ConversationState enum)
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { VoiceShellClass } from 'src/app/domain/constants/voice-shell-constants';
import { ConversationState } from '../../aside/assistant-chat/services/conversation-orchestrator.service';

@Component({
  selector: 'app-voice-shell-icon',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './voice-shell-icon.component.html',
  styleUrl: './voice-shell-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceShellIconComponent {
  readonly state = input.required<ConversationState>();

  readonly stateClass = computed<string>(() => {
    switch (this.state()) {
      case ConversationState.Idle: return VoiceShellClass.StateIdle;
      case ConversationState.Listening: return VoiceShellClass.StateListening;
      case ConversationState.Enhancing: return VoiceShellClass.StateEnhancing;
      case ConversationState.Processing: return VoiceShellClass.StateProcessing;
      case ConversationState.Speaking: return VoiceShellClass.StateSpeaking;
    }
  });

  readonly ariaKey = computed<string>(() => {
    switch (this.state()) {
      case ConversationState.Idle: return 'klacksy.voice.aria.idle';
      case ConversationState.Listening: return 'klacksy.voice.aria.listening';
      case ConversationState.Enhancing: return 'klacksy.voice.aria.transcribing';
      case ConversationState.Processing: return 'klacksy.voice.aria.thinking';
      case ConversationState.Speaking: return 'klacksy.voice.aria.speaking';
    }
  });

  readonly waveBars: readonly number[] = [0, 1, 2, 3, 4];
  readonly isListening = computed(() => this.state() === ConversationState.Listening);
  readonly isEnhancing = computed(() => this.state() === ConversationState.Enhancing);
  readonly isProcessing = computed(() => this.state() === ConversationState.Processing);
  readonly isSpeaking = computed(() => this.state() === ConversationState.Speaking);
  readonly showMic = computed(() => {
    const s = this.state();
    return s === ConversationState.Idle || s === ConversationState.Listening;
  });
}
