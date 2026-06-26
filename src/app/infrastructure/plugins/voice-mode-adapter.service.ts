// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Thin adapter that satisfies IPluginVoiceService by delegating to ConversationOrchestratorService.
 * Translates plain boolean interface properties to orchestrator signals and maps plugin callbacks.
 * @param orchestrator - The shared conversation state machine handling voice lifecycle
 */
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IPluginVoiceService, IPluginVoiceCallbacks } from 'klacks-plugin-contracts';
import { ConversationOrchestratorService, ConversationState, ConversationCallbacks } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { TranslateService } from '@ngx-translate/core';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';

@Injectable()
export class VoiceModeAdapterService implements IPluginVoiceService, OnDestroy {
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly translateService = inject(TranslateService);
  private readonly languageMappingService = inject(LanguageMappingService);
  private readonly adapterDestroy$ = new Subject<void>();

  get voiceModeEnabled(): boolean {
    return this.orchestrator.voiceModeEnabled();
  }

  get isListening(): boolean {
    return this.orchestrator.state() === ConversationState.Listening;
  }

  get isTranscribing(): boolean {
    return this.orchestrator.state() === ConversationState.Enhancing;
  }

  initialize(callbacks: IPluginVoiceCallbacks, destroy$: Subject<void>): void {
    const conversationCallbacks: ConversationCallbacks = {
      getInputText: callbacks.getInputText,
      setInputText: callbacks.setInputText,
      sendMessage: async () => { await callbacks.sendMessage(); },
      getAbortController: () => null,
      detectChanges: callbacks.detectChanges,
      isTextProcessing: signal(false),
    };

    const currentLang = this.translateService.currentLang || this.translateService.defaultLang || 'de';
    const locale = this.languageMappingService.getSpeechLocale(currentLang);

    this.orchestrator.initialize(conversationCallbacks, locale);

    destroy$.pipe(takeUntil(this.adapterDestroy$)).subscribe(() => {
      this.orchestrator.ngOnDestroy();
    });
  }

  async toggleVoiceMode(): Promise<void> {
    await this.orchestrator.toggleVoiceMode();
  }

  disableVoiceMode(): void {
    if (this.orchestrator.voiceModeEnabled()) {
      this.orchestrator.toggleVoiceMode();
    }
  }

  isUsingWhisper(): boolean {
    return false;
  }

  ngOnDestroy(): void {
    this.adapterDestroy$.next();
    this.adapterDestroy$.complete();
  }
}
