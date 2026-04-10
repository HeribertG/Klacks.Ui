// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Adapter implementing IPluginVoiceService using SpeechRecognitionService.
 * Provides voice mode for plugins (e.g. MessagingChat) without coupling to the assistant-chat orchestrator.
 * @param speechService - Underlying speech recognition service for microphone access
 * @param translateService - Used for language detection and error messages
 * @param languageMappingService - Maps app language codes to speech recognition locale codes
 */
import { Injectable, inject, NgZone } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SpeechRecognitionService } from 'src/app/presentation/aside/assistant-chat/services/speech-recognition.service';
import { LanguageMappingService } from 'src/app/domain/services/language-mapping.service';
import { DataTranscriptionService } from 'src/app/infrastructure/api/assistant/data-transcription.service';
import { IPluginVoiceService, IPluginVoiceCallbacks } from 'klacks-plugin-contracts';

@Injectable()
export class VoiceModeAdapterService implements IPluginVoiceService {
  private speechService = inject(SpeechRecognitionService);
  private transcriptionService = inject(DataTranscriptionService);
  private translateService = inject(TranslateService);
  private languageMappingService = inject(LanguageMappingService);
  private ngZone = inject(NgZone);

  voiceModeEnabled = false;
  isListening = false;
  isTranscribing = false;

  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SILENCE_AUTO_SEND_DELAY_MS = 3000;
  private callbacks!: IPluginVoiceCallbacks;
  private destroy$ = new Subject<void>();

  initialize(callbacks: IPluginVoiceCallbacks, destroy$: Subject<void>): void {
    this.callbacks = callbacks;
    this.destroy$ = destroy$;
  }

  async enableVoiceMode(): Promise<void> {
    const diagnostics = this.speechService.getDiagnostics();

    if (!this.speechService.isSupported$()) {
      const errorMsg = diagnostics.isArmProcessor
        ? 'Speech recognition may not be fully supported on Windows ARM devices.'
        : 'Speech recognition is not supported in this browser.';
      alert(errorMsg);
      return;
    }

    try {
      const hasPermission = await this.speechService.requestPermissions();
      if (!hasPermission) {
        alert(this.translateService.instant('assistant-chat.error.microphone-permission'));
        return;
      }
    } catch {
      alert(this.translateService.instant('assistant-chat.error.microphone-access'));
      return;
    }

    this.voiceModeEnabled = true;
    this.startVoiceListening();
  }

  disableVoiceMode(): void {
    this.voiceModeEnabled = false;
    this.clearSilenceTimer();
    if (this.isListening) {
      this.speechService.stopListening();
      this.isListening = false;
    }
  }

  async toggleVoiceMode(): Promise<void> {
    if (this.voiceModeEnabled) {
      this.disableVoiceMode();
    } else {
      await this.enableVoiceMode();
    }
  }

  startVoiceListening(): void {
    if (!this.voiceModeEnabled || this.isListening || this.callbacks.getIsProcessing()) {
      return;
    }

    const currentLang = this.translateService.currentLang || this.translateService.defaultLang;
    const speechLang = this.languageMappingService.getSpeechLocale(currentLang);

    this.callbacks.setInputText('');
    this.isListening = true;

    this.speechService.interimResults
      .pipe(takeUntil(this.destroy$))
      .subscribe((text: string) => {
        this.ngZone.run(() => {
          this.callbacks.setInputText(text);
          this.resetSilenceTimer();
          this.callbacks.detectChanges();
        });
      });

    this.startSilenceTimer();

    this.speechService
      .startListening(speechLang)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (text: string) => {
          this.ngZone.run(() => {
            this.callbacks.setInputText(text);
            this.isListening = false;
            this.isTranscribing = false;
            this.callbacks.detectChanges();
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.isListening = false;
            this.isTranscribing = false;
            this.callbacks.detectChanges();
          });
        },
      });

    this.speechService.errors
      .pipe(takeUntil(this.destroy$))
      .subscribe((_error) => {
        this.ngZone.run(() => {
          this.isTranscribing = false;
          if (this.voiceModeEnabled) {
            setTimeout(() => this.startVoiceListening(), 1000);
          }
          this.callbacks.detectChanges();
        });
      });
  }

  isUsingWhisper(): boolean {
    return this.speechService.getDiagnostics().useWhisperFallback;
  }

  private async handleSilenceTimeout(): Promise<void> {
    if (!this.isListening || !this.callbacks.getInputText().trim()) {
      if (this.voiceModeEnabled) {
        this.startSilenceTimer();
      }
      return;
    }

    this.clearSilenceTimer();
    this.isTranscribing = true;
    this.speechService.stopListening();
    this.isListening = false;
    this.callbacks.detectChanges();

    await new Promise(resolve => setTimeout(resolve, 500));

    const rawText = this.callbacks.getInputText().trim();
    if (rawText && !this.callbacks.getIsProcessing()) {
      const locale = this.languageMappingService.getSpeechLocale(
        this.translateService.currentLang || this.translateService.defaultLang
      );
      const enhancedText = await this.transcriptionService.enhance(rawText, locale);
      this.callbacks.setInputText(enhancedText);
      this.isTranscribing = false;
      this.callbacks.detectChanges();
      await this.callbacks.sendMessage();
    } else {
      this.isTranscribing = false;
      this.callbacks.detectChanges();
    }

    if (this.voiceModeEnabled && !this.callbacks.getIsProcessing()) {
      setTimeout(() => this.startVoiceListening(), 500);
    }
  }

  private startSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.handleSilenceTimeout();
      });
    }, this.SILENCE_AUTO_SEND_DELAY_MS);
  }

  private resetSilenceTimer(): void {
    if (this.isListening) {
      this.startSilenceTimer();
    }
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
}
