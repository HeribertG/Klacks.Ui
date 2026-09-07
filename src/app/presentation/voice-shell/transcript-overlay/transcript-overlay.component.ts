// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Transcript card for the overlay rail, listing the last N conversation messages. It behaves like
 * the assistant cards in the persistent lane - header click collapses it to its icon, and nothing
 * clicked elsewhere dismisses it - but unlike them it is not ambient: it appears on right-click /
 * long-press on the bubble and leaves on its close button or ESC. That gesture lives in another
 * lane, so the state comes from TranscriptOverlayService rather than from an input.
 */

import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronUp, faComments } from '@fortawesome/free-solid-svg-icons';
import { ChatMessage } from '../../aside/assistant-chat/chat-message.interface';
import { ConversationOrchestratorService } from '../../aside/assistant-chat/services/conversation-orchestrator.service';
import { TranscriptOverlayService } from './transcript-overlay.service';
import { VoiceShellLayout } from 'src/app/domain/constants/voice-shell-constants';

@Component({
  selector: 'app-transcript-overlay',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule],
  templateUrl: './transcript-overlay.component.html',
  styleUrl: './transcript-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptOverlayComponent {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly transcriptService = inject(TranscriptOverlayService);

  readonly isOpen = this.transcriptService.isOpen;
  readonly isExpanded = this.transcriptService.isExpanded;

  readonly visibleMessages = computed<readonly ChatMessage[]>(() => {
    const all = this.orchestrator.messages();
    const max = VoiceShellLayout.TranscriptMaxMessages;
    return all.length <= max ? all : all.slice(all.length - max);
  });

  readonly faChevronUp = faChevronUp;
  readonly faComments = faComments;

  toggleExpanded(): void {
    this.transcriptService.toggleExpanded();
  }

  close(): void {
    this.transcriptService.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
