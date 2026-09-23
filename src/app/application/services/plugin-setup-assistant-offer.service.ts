// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generic host-side implementation of IPluginAssistantLauncher: offers Klacksy's commissioning help
 * as an interactive toast, once per session per caller-supplied key. Exists so a plugin (or the
 * feature-plugins settings screen itself) can trigger the offer without depending on the toast,
 * aside or conversation-orchestrator services directly - see setup-consultation-offer.service.ts for
 * the original single-purpose pattern this generalizes. All translation keys (offer, accept, decline,
 * trigger phrase) are stated explicitly by the caller - none is derived from another.
 * @param translate - Resolves the offer text, chip labels and the per-language trigger phrase
 * @param toastShowService - Surfaces the offer as an interactive reply toast
 * @param conversationOrchestrator - Submits the trigger phrase as a real user turn once accepted
 * @param asideService - Opens the Klacksy panel, but only once the offer is accepted
 * @param onboarding - Single source of truth for whether the guided tour is running
 */

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IPluginAssistantLauncher, IPluginAssistantSetupOffer } from 'klacks-plugin-contracts';
import { OnboardingService } from './onboarding.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';

const DECLINE_VALUE = 'none';
/** AssistantChatComponent only mounts once the aside becomes visible, so submitText() is deferred
 * one macrotask via setTimeout(0) after show() - same mount-timing workaround as
 * SetupConsultationOfferService. */
const ASSISTANT_CHAT_MOUNT_DELAY_MS = 0;

@Injectable({ providedIn: 'root' })
export class PluginSetupAssistantOfferService implements IPluginAssistantLauncher {
  private readonly translate = inject(TranslateService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly conversationOrchestrator = inject(ConversationOrchestratorService);
  private readonly asideService = inject(AsideService);
  private readonly onboarding = inject(OnboardingService);

  offerSetupHelp(setup: IPluginAssistantSetupOffer, oncePerSessionKey: string): void {
    if (this.onboarding.isTourActive() || this.wasOfferedThisSession(oncePerSessionKey)) {
      return;
    }

    this.markOfferedThisSession(oncePerSessionKey);

    const triggerPhrase = this.translate.instant(setup.triggerPhraseKey);

    this.toastShowService.showInteractiveReply(
      {
        selectionMode: 'single',
        prompt: this.translate.instant(setup.offerKey),
        options: [
          { label: this.translate.instant(setup.acceptKey), value: triggerPhrase },
          { label: this.translate.instant(setup.declineKey), value: DECLINE_VALUE },
        ],
      },
      (values) => {
        if (!values.includes(triggerPhrase)) {
          return;
        }
        this.asideService.show();
        setTimeout(() => {
          void this.conversationOrchestrator.submitText(triggerPhrase);
        }, ASSISTANT_CHAT_MOUNT_DELAY_MS);
      },
    );
  }

  private wasOfferedThisSession(oncePerSessionKey: string): boolean {
    try {
      return sessionStorage.getItem(StorageKeys.PLUGIN_ASSISTANT_OFFERED_PREFIX + oncePerSessionKey) === 'true';
    } catch {
      return false;
    }
  }

  private markOfferedThisSession(oncePerSessionKey: string): void {
    try {
      sessionStorage.setItem(StorageKeys.PLUGIN_ASSISTANT_OFFERED_PREFIX + oncePerSessionKey, 'true');
    } catch {
      return;
    }
  }
}
