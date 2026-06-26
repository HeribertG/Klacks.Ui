// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';

@Component({
  selector: 'app-voice-shell-input',
  standalone: true,
  imports: [FormsModule, FontAwesomeModule, TranslateModule],
  templateUrl: './voice-shell-input.component.html',
  styleUrl: './voice-shell-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceShellInputComponent {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly assistantService = inject(DataManagementAssistantService);
  private readonly assistantProviderService = inject(DataManagementAssistantProviderService);

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

  async send(): Promise<void> {
    const text = this.inputText().trim();
    if (!text || this.isDisabled()) return;
    this.inputText.set('');
    await this.orchestrator.submitText(text);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }
}
