// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Floating text input bar shown below the voice shell icon when outputMode=both-auto.
 * Allows typing messages without opening the aside panel; delegates sending to the orchestrator.
 * @param inputText - Current text entered by the user
 * @param isDisabled - True while models are initializing or no API key is configured
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { ConversationOrchestratorService } from '../../aside/assistant-chat/services/conversation-orchestrator.service';
import { TextToSpeechService } from '../../aside/assistant-chat/services/text-to-speech.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { PlaygroundPromptGateService } from 'src/app/domain/services/playground/playground-prompt-gate.service';
import { PlaygroundNoticeComponent } from 'src/app/presentation/playground/playground-notice/playground-notice.component';
import { PlaygroundPromptCounterComponent } from 'src/app/presentation/playground/playground-prompt-counter/playground-prompt-counter.component';
import { PlaygroundSendGuardService } from 'src/app/presentation/playground/playground-send-guard.service';
import { isPrintableKey } from 'src/app/shared/helpers/keyboard.helper';

@Component({
  selector: 'app-voice-shell-input',
  standalone: true,
  imports: [FormsModule, FontAwesomeModule, TranslateModule, PlaygroundNoticeComponent, PlaygroundPromptCounterComponent],
  templateUrl: './voice-shell-input.component.html',
  styleUrl: './voice-shell-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceShellInputComponent {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly ttsService = inject(TextToSpeechService);
  private readonly assistantService = inject(DataManagementAssistantService);
  private readonly assistantProviderService = inject(DataManagementAssistantProviderService);
  private readonly playgroundGate = inject(PlaygroundPromptGateService);
  private readonly sendGuard = inject(PlaygroundSendGuardService);

  readonly faPaperPlane = faPaperPlane;
  readonly inputText = signal('');

  readonly isInitializing = computed(
    () =>
      !this.assistantService.modelsInitialized() ||
      !this.assistantProviderService.providersInitialized(),
  );

  readonly hasNoApiKey = computed(() => {
    if (this.isInitializing()) return false;
    const providers = this.assistantProviderService.getCurrentProviders();
    if (!providers || providers.length === 0) return true;
    return !providers.some((p) => p.hasApiKey);
  });

  readonly isDisabled = computed(() => this.isInitializing() || this.hasNoApiKey());
  readonly isSendBlocked = computed(() => this.isDisabled() || this.playgroundGate.confirmationPending());
  readonly maxPromptChars = this.playgroundGate.maxPromptChars;

  async send(): Promise<void> {
    if (!this.inputText().trim() || this.isDisabled()) return;
    if (!(await this.sendGuard.allowSendWhenReady(() => this.inputText().trim()))) return;
    const text = this.inputText().trim();
    this.inputText.set('');
    await this.orchestrator.submitText(text);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (isPrintableKey(event)) {
      this.ttsService.interrupt();
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }
}
