// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Transient overlay listing the last N conversation messages from the orchestrator.
 * Triggered by right-click / long-press on the voice-shell icon. Emits `closed` on
 * click-outside or on the close-button. ESC handling lives on the parent shell.
 * @param messages - Full orchestrator message history; only the last N are rendered
 * @param closed - Output emitted when the overlay should be dismissed
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ChatMessage } from '../../aside/assistant-chat/chat-message.interface';
import { VoiceShellLayout } from 'src/app/domain/constants/voice-shell-constants';

@Component({
  selector: 'app-transcript-overlay',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './transcript-overlay.component.html',
  styleUrl: './transcript-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptOverlayComponent {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly messages = input.required<readonly ChatMessage[]>();
  readonly closed = output<void>();

  readonly visibleMessages = computed<readonly ChatMessage[]>(() => {
    const all = this.messages();
    const max = VoiceShellLayout.TranscriptMaxMessages;
    return all.length <= max ? all : all.slice(all.length - max);
  });

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const host = this.hostRef.nativeElement as HTMLElement;
    if (!host.contains(event.target as Node)) {
      this.close();
    }
  }
}
