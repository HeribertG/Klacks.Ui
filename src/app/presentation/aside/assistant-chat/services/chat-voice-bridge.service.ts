// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Connects the app-wide voice orchestrator to one assistant chat instance: hands it the chat's input,
 * send, abort and stop callbacks plus the initial speech locale, and surfaces its error hints in the
 * classic chat panel, where no voice-shell icon exists to blink.
 * @param hint - Error hint emitted by the conversation orchestrator
 */
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { LanguageMappingService } from 'src/app/application/services/language-mapping.service';
import { SpeechOutputModeService } from 'src/app/application/services/speech-output-mode.service';
import type { IVoiceShellErrorHint } from 'src/app/domain/models/assistant/voice-shell-error-hint.model';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { ChatTurnControlService } from './chat-turn-control.service';
import { ChatComposerService } from './chat-composer.service';
import { ChatTranscriptService } from './chat-transcript.service';
import { ChatTurnStreamService } from './chat-turn-stream.service';

const STT_EMPTY_HINT_KIND = 'stt-empty';
const SESSION_END_REASON = 'session-end';

@Injectable()
export class ChatVoiceBridgeService {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly turnControl = inject(ChatTurnControlService);
  private readonly composer = inject(ChatComposerService);
  private readonly transcript = inject(ChatTranscriptService);
  private readonly turnStream = inject(ChatTurnStreamService);
  private readonly languageMappingService = inject(LanguageMappingService);
  private readonly outputModes = inject(SpeechOutputModeService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Registers this chat instance with the orchestrator. session-end also fires automatically when the
   * floating shell disappears; that stop must not cancel a running execution.
   */
  connect(): void {
    const speechLocale = this.languageMappingService.getSpeechLocale(this.languageMappingService.resolveUserLanguage());
    this.orchestrator.initialize(
      {
        getInputText: () => this.composer.inputText(),
        setInputText: (text: string) => {
          this.composer.inputText.set(text);
        },
        sendMessage: () => this.turnStream.sendMessage(),
        getAbortController: () => this.turnStream.currentAbortController(),
        detectChanges: () => this.transcript.detectChanges(),
        isTextProcessing: this.turnControl.isTurnRunning,
        stop: (reason) => {
          if (reason !== SESSION_END_REASON) {
            this.turnControl.cancelRunningExecutions();
          }
          void this.turnControl.stop(reason);
        },
      },
      speechLocale,
    );

    this.orchestrator.errors$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((hint) => this.onVoiceErrorHint(hint));
  }

  private onVoiceErrorHint(hint: IVoiceShellErrorHint): void {
    if (this.outputModes.isFloatingMode()) {
      return;
    }
    const message = this.translateService.instant(hint.i18nKey);
    if (hint.kind === STT_EMPTY_HINT_KIND) {
      this.toastShowService.showInfo(message);
    } else {
      this.toastShowService.showError(message);
    }
  }
}
