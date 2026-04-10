// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for configuring Klacksy speech preferences.
 * @param sttEngine - Selected speech-to-text engine
 * @param sttApiKey - API key for cloud STT providers
 * @param ttsVoice - Selected text-to-speech voice
 * @param ttsProvider - Selected TTS provider
 * @param transcriptionModel - Selected LLM model for transcription cleanup
 * @param enhancementEnabled - Whether transcription enhancement is active
 * @param outputMode - Selected output mode (text, audio, or both)
 * @param silenceThresholdMs - Silence duration in milliseconds before auto-send
 */
import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

@Component({
  selector: 'app-assistant-speech-settings',
  templateUrl: './assistant-speech-settings.component.html',
  styleUrls: ['./assistant-speech-settings.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantSpeechSettingsComponent implements OnInit {
  private appSettingsService = inject(AppSettingsManagementService);

  private isInitialized = false;

  sttEngine = 'browser';
  sttApiKey = '';
  ttsVoice = 'auto';
  ttsProvider = 'edge';
  transcriptionModel = 'deepseek-chat';
  enhancementEnabled = true;
  outputMode = 'both';
  silenceThresholdMs = 1500;

  readonly ttsVoices = [
    { value: 'auto', label: 'Auto (per Sprache)' },
    { value: 'de-DE-ConradNeural', label: 'Deutsch - Conrad' },
    { value: 'de-DE-KatjaNeural', label: 'Deutsch - Katja' },
    { value: 'en-US-GuyNeural', label: 'English - Guy' },
    { value: 'en-US-JennyNeural', label: 'English - Jenny' },
    { value: 'fr-FR-HenriNeural', label: 'Français - Henri' },
    { value: 'fr-FR-DeniseNeural', label: 'Français - Denise' },
    { value: 'es-ES-AlvaroNeural', label: 'Español - Alvaro' },
    { value: 'es-ES-ElviraNeural', label: 'Español - Elvira' },
    { value: 'it-IT-DiegoNeural', label: 'Italiano - Diego' },
    { value: 'it-IT-ElsaNeural', label: 'Italiano - Elsa' },
    { value: 'pt-BR-AntonioNeural', label: 'Português - Antonio' },
    { value: 'tr-TR-AhmetNeural', label: 'Türkçe - Ahmet' },
    { value: 'pl-PL-MarekNeural', label: 'Polski - Marek' },
    { value: 'ja-JP-KeitaNeural', label: '日本語 - Keita' },
    { value: 'ko-KR-InJoonNeural', label: '한국어 - InJoon' },
    { value: 'zh-CN-YunxiNeural', label: '中文 - Yunxi' },
    { value: 'zh-TW-YunJheNeural', label: '繁體中文 - YunJhe' },
    { value: 'ar-SA-HamedNeural', label: 'العربية - Hamed' },
    { value: 'he-IL-AvriNeural', label: 'עברית - Avri' },
    { value: 'th-TH-NiwatNeural', label: 'ไทย - Niwat' },
    { value: 'vi-VN-NamMinhNeural', label: 'Tiếng Việt - NamMinh' },
    { value: 'id-ID-ArdiNeural', label: 'Indonesia - Ardi' },
    { value: 'ms-MY-OsmanNeural', label: 'Melayu - Osman' },
  ];

  readonly sttEngines = [
    { value: 'browser', labelKey: 'setting.speech.stt-webspeech' },
    { value: 'whisper', labelKey: 'setting.speech.stt-whisper' },
  ];

  readonly ttsProviders = [
    { value: 'edge', labelKey: 'setting.speech.tts-edge' },
    { value: 'browser', labelKey: 'setting.speech.tts-browser' },
  ];

  readonly outputModes = [
    { value: 'text', labelKey: 'setting.speech.output-text-only' },
    { value: 'audio', labelKey: 'setting.speech.output-audio-only' },
    { value: 'both', labelKey: 'setting.speech.output-both' },
  ];

  readonly transcriptionModels = [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'claude-haiku', label: 'Claude Haiku' },
  ];

  async ngOnInit(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    const speech = this.appSettingsService.speechSettings();

    this.sttEngine = speech.sttEngine;
    this.sttApiKey = speech.sttApiKey;
    this.ttsVoice = speech.ttsVoice;
    this.ttsProvider = speech.ttsProvider;
    this.transcriptionModel = speech.transcriptionModel;
    this.enhancementEnabled = speech.enhancementEnabled;
    this.outputMode = speech.outputMode;
    this.silenceThresholdMs = speech.silenceThresholdMs;
    this.isInitialized = true;
  }

  onSettingChanged(): void {
    if (!this.isInitialized) {
      return;
    }

    this.appSettingsService.speechSettings.set({
      sttEngine: this.sttEngine,
      sttApiKey: this.sttApiKey,
      ttsVoice: this.ttsVoice,
      ttsProvider: this.ttsProvider,
      transcriptionModel: this.transcriptionModel,
      enhancementEnabled: this.enhancementEnabled,
      outputMode: this.outputMode,
      silenceThresholdMs: this.silenceThresholdMs,
    });
  }
}
