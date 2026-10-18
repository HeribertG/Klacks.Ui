// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Opens the Klacksy panel and sends a text as a real user turn. AssistantChatComponent (and with it the
 * orchestrator's callbacks) only mounts once the aside becomes visible, so the text is sent one macrotask after
 * show(). The single place for this mount-timing workaround; offer services and toast actions call it instead of
 * repeating show() + setTimeout(0) + submitText(). The user's own work wins over a launched question: while a turn
 * is running or stopping, or while the open chat holds a typed draft, the panel is only shown - nothing is prefilled
 * or sent, so the draft is not overwritten and the running turn is not superseded. The draft is only read while the
 * aside is visible, because a closed panel's chat is destroyed and its last draft is gone with it.
 * @param text - The question Klacksy receives as if the user had typed it; blank text sends nothing
 */

import { inject, Injectable } from '@angular/core';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ChatTurnControlService } from 'src/app/presentation/aside/assistant-chat/services/chat-turn-control.service';

const ASSISTANT_CHAT_MOUNT_DELAY_MS = 0;

@Injectable({ providedIn: 'root' })
export class AssistantTurnLauncherService {
  private readonly asideService = inject(AsideService);
  private readonly conversationOrchestrator = inject(ConversationOrchestratorService);
  private readonly turnControl = inject(ChatTurnControlService);

  openAndAsk(text: string): void {
    if (!text.trim()) {
      return;
    }

    const userIsBusy = this.isUserBusy();
    this.asideService.show();
    if (userIsBusy) {
      return;
    }

    setTimeout(() => {
      void this.conversationOrchestrator.submitText(text);
    }, ASSISTANT_CHAT_MOUNT_DELAY_MS);
  }

  private isUserBusy(): boolean {
    return (
      this.turnControl.isTurnRunning() ||
      this.turnControl.isStopping() ||
      (this.asideService.isVisible() && this.conversationOrchestrator.hasDraft())
    );
  }
}
