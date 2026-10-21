// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Decides whether a finished assistant message is read aloud in the auto-speak output mode: never
 * while the sentence-wise streaming speech already speaks it, and never in voice mode, whose
 * orchestrator speaks on its own.
 * @param message - The finished assistant message, undefined when it is no longer in the transcript
 */
import { Injectable, inject } from '@angular/core';
import { SpeechOutputModeService } from 'src/app/application/services/speech-output-mode.service';
import { ChatMessage } from '../chat-message.interface';
import { ChatMessageActionsService } from './chat-message-actions.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';

@Injectable({ providedIn: 'root' })
export class ChatAutoSpeakService {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly outputModes = inject(SpeechOutputModeService);
  private readonly messageActions = inject(ChatMessageActionsService);

  maybeAutoSpeak(message: ChatMessage | undefined): void {
    if (this.orchestrator.isAutoSpeakStreaming()) {
      return;
    }
    if (message && !this.orchestrator.voiceModeEnabled() && this.outputModes.isAutoSpeakMode()) {
      this.messageActions.speakMessage(message);
    }
  }
}
