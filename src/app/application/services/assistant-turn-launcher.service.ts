// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Opens the Klacksy panel and sends a text as a real user turn. AssistantChatComponent (and with it the
 * orchestrator's callbacks) only mounts once the aside becomes visible, so the text is sent one macrotask after
 * show(). The single place for this mount-timing workaround; offer services and toast actions call it instead of
 * repeating show() + setTimeout(0) + submitText().
 * @param text - The question Klacksy receives as if the user had typed it; blank text sends nothing
 */

import { inject, Injectable } from '@angular/core';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';

const ASSISTANT_CHAT_MOUNT_DELAY_MS = 0;

@Injectable({ providedIn: 'root' })
export class AssistantTurnLauncherService {
  private readonly asideService = inject(AsideService);
  private readonly conversationOrchestrator = inject(ConversationOrchestratorService);

  openAndAsk(text: string): void {
    if (!text.trim()) {
      return;
    }

    this.asideService.show();
    setTimeout(() => {
      void this.conversationOrchestrator.submitText(text);
    }, ASSISTANT_CHAT_MOUNT_DELAY_MS);
  }
}
