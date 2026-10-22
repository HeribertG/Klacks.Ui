// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Opens the Klacksy panel and sends a text as a real user turn. AssistantChatComponent (and with it the
 * orchestrator's callbacks) only mounts once the aside becomes visible, so the text is sent one macrotask after
 * show(). The single place for this mount-timing workaround; offer services and toast actions call it instead of
 * repeating show() + setTimeout(0) + submitText(). The user's own work wins over a launched question: while a turn
 * is running or stopping, or while the open chat holds a typed draft, the panel is only shown - nothing is prefilled
 * or sent, so the draft is not overwritten and the running turn is not superseded. The draft is only read while the
 * aside is visible, because a closed panel's chat is destroyed and its last draft is gone with it. The turn state
 * (ChatTurnControlService, which pulls in the assistant data services) is looked up only on a click, so pages that
 * merely hold an offer service do not build that chain.
 * @param text - The question Klacksy receives as if the user had typed it; blank text sends nothing
 * @returns Whether the text is sent; false for blank text and while the user is busy (panel only shown)
 */

import { inject, Injectable, Injector } from '@angular/core';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ChatTurnControlService } from 'src/app/presentation/aside/assistant-chat/services/chat-turn-control.service';

const ASSISTANT_CHAT_MOUNT_DELAY_MS = 0;

@Injectable({ providedIn: 'root' })
export class AssistantTurnLauncherService {
  private readonly asideService = inject(AsideService);
  private readonly conversationOrchestrator = inject(ConversationOrchestratorService);
  private readonly injector = inject(Injector);

  openAndAsk(text: string): boolean {
    if (!text.trim()) {
      return false;
    }

    const userIsBusy = this.isUserBusy();
    this.asideService.show();
    if (userIsBusy) {
      return false;
    }

    setTimeout(() => {
      void this.conversationOrchestrator.submitText(text);
    }, ASSISTANT_CHAT_MOUNT_DELAY_MS);
    return true;
  }

  private isUserBusy(): boolean {
    const turnControl = this.injector.get(ChatTurnControlService);
    return (
      turnControl.isTurnRunning() ||
      turnControl.isStopping() ||
      (this.asideService.isVisible() && this.conversationOrchestrator.hasDraft())
    );
  }
}
