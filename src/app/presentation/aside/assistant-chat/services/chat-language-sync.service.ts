// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Keeps the language-dependent parts of one assistant chat instance in step with the UI language:
 * speech recognition, the LLM answer language, the voice orchestrator's locale and the welcome text.
 * @param langCode - UI language code, mapped onto a speech locale where speech needs one
 */
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { LanguageMappingService } from 'src/app/application/services/language-mapping.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { SpeechRecognitionService } from './speech-recognition.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { ChatWelcomeService } from './chat-welcome.service';

@Injectable()
export class ChatLanguageSyncService {
  private readonly translateService = inject(TranslateService);
  private readonly languageMappingService = inject(LanguageMappingService);
  private readonly assistantService = inject(DataManagementAssistantService);
  private readonly speechService = inject(SpeechRecognitionService);
  private readonly orchestrator = inject(ConversationOrchestratorService);
  private readonly welcome = inject(ChatWelcomeService);
  private readonly destroyRef = inject(DestroyRef);

  /** Follows later language switches and applies the user's current language right away. */
  connect(): void {
    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        this.updateSpeechLanguage(event.lang);
        this.welcome.updateWelcomeMessage(event.lang);
        this.speechService.updateLanguage(this.languageMappingService.getSpeechLocale(event.lang));
        this.orchestrator.setLocale(this.languageMappingService.getSpeechLocale(event.lang));
      });

    this.updateSpeechLanguage(this.languageMappingService.resolveUserLanguage());
  }

  private updateSpeechLanguage(langCode: string): void {
    this.speechService.setLanguage(this.languageMappingService.getSpeechLocale(langCode));
    this.assistantService.setLanguage(langCode);
  }
}
