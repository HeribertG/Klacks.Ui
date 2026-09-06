// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Renders a single Klacksy chat message (user, assistant or proactive-inbox row): avatar,
 * bubble with formatted text, TTS button, thumbs-up/down feedback, and the proactive
 * reaction/dismiss/mute/delegate/acknowledge controls. Standalone so the same rendering can
 * later be reused outside the chat (e.g. an overlay card) without a chat host to wire outputs
 * through - it injects ChatMessageActionsService itself and calls it directly instead of
 * emitting events for a parent to relay.
 * @param message - The chat message to render (required)
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import {
  faArrowRight,
  faBell,
  faBellSlash,
  faCheck,
  faCheckDouble,
  faHandshake,
  faStop,
  faThumbsDown,
  faThumbsUp,
  faTimes,
  faTriangleExclamation,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { TextToSpeechService } from '../services/text-to-speech.service';
import { ChatMessageActionsService } from '../services/chat-message-actions.service';
import { ChatMessage } from '../chat-message.interface';
import { formatMessage } from 'src/app/shared/helpers/assistant-text.helper';
import { PROACTIVE_REACTION, PROACTIVE_REJECT_REASON } from 'src/app/domain/constants/proactive-reaction.constants';
import { PROACTIVE_SEVERITY } from 'src/app/domain/constants/proactive-severity.constants';
import { IconUserComponent } from '../../../icons/icon-user.component';
import { IconMMLComponent } from '../../../icons/icon-mml.component';
import { IconLogoComponent } from '../../../icons/icon-logo.component';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [DatePipe, FontAwesomeModule, TranslateModule, IconUserComponent, IconMMLComponent, IconLogoComponent],
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageComponent {
  readonly message = input.required<ChatMessage>();

  protected readonly actions = inject(ChatMessageActionsService);
  protected readonly ttsService = inject(TextToSpeechService);
  private readonly dataLoadFileService = inject(DataLoadFileService);
  private readonly assistantService = inject(DataManagementAssistantService);
  private readonly assistantProviderService = inject(DataManagementAssistantProviderService);
  private readonly onboarding = inject(OnboardingService);

  protected readonly faArrowRight = faArrowRight;
  protected readonly faBell = faBell;
  protected readonly faBellSlash = faBellSlash;
  protected readonly faCheck = faCheck;
  protected readonly faCheckDouble = faCheckDouble;
  protected readonly faHandshake = faHandshake;
  protected readonly faStop = faStop;
  protected readonly faThumbsDown = faThumbsDown;
  protected readonly faThumbsUp = faThumbsUp;
  protected readonly faTimes = faTimes;
  protected readonly faTriangleExclamation = faTriangleExclamation;
  protected readonly faVolumeHigh = faVolumeHigh;

  protected readonly proactiveReactions = PROACTIVE_REACTION;
  protected readonly proactiveRejectReasons = PROACTIVE_REJECT_REASON;
  protected readonly proactiveSeverities = PROACTIVE_SEVERITY;

  protected readonly logoImage = computed(() => this.dataLoadFileService.logoImage$());
  protected readonly hasLogoImage = computed(() => !!this.logoImage());

  /**
   * Same gate as the chat's own avatar fallback (isTourActive() && !hasNoApiKey()): re-derived
   * here from the same root-provided services rather than taken as an Input, since the tour
   * avatar has no dependency on chat-local state. Mirrors the equivalent duplication already
   * established in voice-shell-input.component.ts for the same "no API key" check.
   */
  private readonly isInitializing = computed(
    () => !this.assistantService.modelsInitialized() || !this.assistantProviderService.providersInitialized(),
  );
  private readonly hasNoApiKey = computed(() => (this.isInitializing() ? false : this.noApiKeyForSelectedModel()));
  protected readonly showTourAvatarLogo = computed(() => this.onboarding.isTourActive() && !this.hasNoApiKey());

  protected readonly formatMessage = formatMessage;

  private noApiKeyForSelectedModel(): boolean {
    const providers = this.assistantProviderService.getCurrentProviders();
    if (!providers || providers.length === 0) return true;
    const currentModelInfo = this.assistantService
      .availableModels()
      .filter((m) => m.isEnabled)
      .find((m) => m.modelId === this.assistantService.selectedModelId());
    if (currentModelInfo) {
      const provider = providers.find((p) => p.providerId === currentModelInfo.providerId);
      return !provider?.hasApiKey;
    }
    return !providers.some((p) => p.hasApiKey);
  }

  protected isMuteSuggestion(message: ChatMessage): boolean {
    return this.actions.isMuteSuggestion(message);
  }
}
