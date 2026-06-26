// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Floating Klacksy shell for outputMode=audio. Renders the icon at top-right,
 * wires click-matrix to the ConversationOrchestratorService state machine,
 * and exposes errorHint signal for transient / persistent error visuals.
 * @param orchestrator - single source of truth for conversation state (root singleton)
 * @param asideService - existing visibility service, used for manual close gesture
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import {
  ConversationOrchestratorService,
  ConversationState,
} from '../aside/assistant-chat/services/conversation-orchestrator.service';
import { AsideService } from '../aside/aside.service';
import { ToastShowService } from '../toast/toast-show.service';
import { VoiceShellIconComponent } from './voice-shell-icon/voice-shell-icon.component';
import { TranscriptOverlayComponent } from './transcript-overlay/transcript-overlay.component';
import {
  VoiceShellTiming,
  VoiceShellClass,
} from 'src/app/domain/constants/voice-shell-constants';
import type { IVoiceShellErrorHint } from 'src/app/domain/models/assistant/voice-shell-error-hint.model';

@Component({
  selector: 'app-voice-shell',
  standalone: true,
  imports: [TranslateModule, VoiceShellIconComponent, TranscriptOverlayComponent],
  templateUrl: './voice-shell.component.html',
  styleUrl: './voice-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceShellComponent implements OnInit {
  readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly asideService = inject(AsideService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly destroyRef = inject(DestroyRef);

  readonly errorHint = signal<IVoiceShellErrorHint | null>(null);
  readonly transcriptOpen = signal<boolean>(false);

  readonly effectiveState = computed<ConversationState>(() => {
    const state = this.orchestrator.state();
    if (state === ConversationState.Idle && this.orchestrator.isTextProcessing()) {
      return ConversationState.Processing;
    }
    return state;
  });

  readonly isIdle = computed<boolean>(() => this.effectiveState() === ConversationState.Idle);

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private errorClearTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.orchestrator.errors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((hint) => this.onErrorHint(hint));

    this.toastShowService.interactiveReplyShown$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.transcriptOpen.set(false));
  }

  handleClick(): void {
    const state = this.orchestrator.state();
    switch (state) {
      case ConversationState.Idle:
        this.orchestrator.startSession();
        break;
      case ConversationState.Listening:
        this.orchestrator.endSession();
        this.toastShowService.dismissInteractiveReplies();
        break;
      case ConversationState.Processing:
        this.orchestrator.endSession();
        this.toastShowService.dismissInteractiveReplies();
        break;
      case ConversationState.Speaking:
        this.orchestrator.interruptAndListen();
        break;
      case ConversationState.Enhancing:
        break;
    }
  }

  handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.toastShowService.dismissInteractiveReplies();
    this.transcriptOpen.set(true);
  }

  handleTouchStart(): void {
    this.longPressTimer = setTimeout(() => {
      this.toastShowService.dismissInteractiveReplies();
      this.transcriptOpen.set(true);
    }, VoiceShellTiming.LongPressMs);
  }

  handleTouchEnd(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  handleClose(event: MouseEvent): void {
    event.stopPropagation();
    this.asideService.hide();
  }

  handleOverlayClose(): void {
    this.transcriptOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.transcriptOpen()) {
      this.transcriptOpen.set(false);
    }
  }

  private onErrorHint(hint: IVoiceShellErrorHint): void {
    if (this.errorClearTimer !== null) {
      clearTimeout(this.errorClearTimer);
      this.errorClearTimer = null;
    }
    this.errorHint.set(hint);
    if (!hint.persistent) {
      this.errorClearTimer = setTimeout(() => {
        this.errorHint.set(null);
        this.errorClearTimer = null;
      }, VoiceShellTiming.ErrorBlinkMs);
    }
  }

  protected readonly VoiceShellClass = VoiceShellClass;
}
