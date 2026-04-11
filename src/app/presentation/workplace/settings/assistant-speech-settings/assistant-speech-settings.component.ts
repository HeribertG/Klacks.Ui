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
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { firstValueFrom } from 'rxjs';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataSttService } from 'src/app/infrastructure/api/assistant/data-stt.service';
import { DataTtsService } from 'src/app/infrastructure/api/assistant/data-tts.service';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import {
  SttEngine,
  TtsProvider,
  OutputMode,
  VoiceId,
  SpeechDefaults,
} from 'src/app/domain/constants/speech-constants';

@Component({
  selector: 'app-assistant-speech-settings',
  templateUrl: './assistant-speech-settings.component.html',
  styleUrls: ['./assistant-speech-settings.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule, NgxSliderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantSpeechSettingsComponent implements OnInit {
  private appSettingsService = inject(AppSettingsManagementService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private dataSttService = inject(DataSttService);
  private dataTtsService = inject(DataTtsService);
  private dataAssistantService = inject(DataAssistantService);

  private isInitialized = false;

  sttEngine = SttEngine.Browser;
  sttApiKey = '';
  sttApiKeyConfigured = false;
  ttsVoice = VoiceId.Auto;
  ttsProvider = TtsProvider.Edge;
  transcriptionModel = SpeechDefaults.TranscriptionModel;
  enhancementEnabled = true;
  outputMode = OutputMode.Both;
  silenceThresholdMs = SpeechDefaults.SilenceThresholdMs;

  readonly silenceOptions: Options = {
    floor: 500,
    ceil: 3000,
    step: 100,
    showSelectionBar: true,
    translate: (value: number): string => `${value}ms`,
  };

  readonly ttsVoices = signal<{ value: string; label: string }[]>([
    { value: VoiceId.Auto, label: 'Auto' },
  ]);

  readonly sttProviders = [
    { value: SttEngine.Browser, labelKey: 'setting.speech.stt-browser' },
    { value: SttEngine.Deepgram, labelKey: 'setting.speech.stt-deepgram' },
    { value: SttEngine.GroqWhisper, labelKey: 'setting.speech.stt-groq' },
    { value: SttEngine.AssemblyAi, labelKey: 'setting.speech.stt-assemblyai' },
  ];

  readonly ttsProviders = [
    { value: TtsProvider.Edge, labelKey: 'setting.speech.tts-edge' },
    { value: TtsProvider.OpenAi, labelKey: 'setting.speech.tts-openai' },
    {
      value: TtsProvider.ElevenLabs,
      labelKey: 'setting.speech.tts-elevenlabs',
    },
  ];

  readonly outputModes = [
    { value: OutputMode.Text, labelKey: 'setting.speech.output-text-only' },
    { value: OutputMode.Audio, labelKey: 'setting.speech.output-audio-only' },
    { value: OutputMode.Both, labelKey: 'setting.speech.output-both' },
  ];

  readonly transcriptionModels = signal<{ value: string; label: string }[]>([]);

  async ngOnInit(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    const speech = this.appSettingsService.speechSettings();

    this.sttEngine = speech.sttEngine;
    if (speech.sttApiKey === '***') {
      this.sttApiKeyConfigured = true;
      this.sttApiKey = '';
    } else {
      this.sttApiKeyConfigured = false;
      this.sttApiKey = speech.sttApiKey;
    }
    this.ttsVoice = speech.ttsVoice;
    this.ttsProvider = speech.ttsProvider;
    this.transcriptionModel = speech.transcriptionModel;
    this.enhancementEnabled = speech.enhancementEnabled;
    this.outputMode = speech.outputMode;
    this.silenceThresholdMs = speech.silenceThresholdMs;
    this.isInitialized = true;

    const voices = await this.dataTtsService.getVoices();
    this.ttsVoices.set([
      { value: VoiceId.Auto, label: 'Auto' },
      ...voices.map((v) => ({
        value: v.voiceId,
        label: `${v.locale} - ${v.displayName}`,
      })),
    ]);

    try {
      const models = await firstValueFrom(
        this.dataAssistantService.getModels(),
      );
      this.transcriptionModels.set(
        models
          .filter((m) => m.isEnabled)
          .map((m) => ({
            value: m.modelId,
            label: m.displayName ?? m.modelId,
          })),
      );
    } catch {
      this.transcriptionModels.set([]);
    }
  }

  onSettingChanged(): void {
    if (!this.isInitialized) {
      return;
    }

    const apiKeyToSave =
      this.sttApiKey.length > 0
        ? this.sttApiKey
        : this.sttApiKeyConfigured
          ? '***'
          : '';
    this.appSettingsService.speechSettings.set({
      sttEngine: this.sttEngine,
      sttApiKey: apiKeyToSave,
      ttsVoice: this.ttsVoice,
      ttsProvider: this.ttsProvider,
      transcriptionModel: this.transcriptionModel,
      enhancementEnabled: this.enhancementEnabled,
      outputMode: this.outputMode,
      silenceThresholdMs: this.silenceThresholdMs,
    });
  }

  async testSttConnection(): Promise<void> {
    const result = await this.dataSttService.testConnection(this.sttEngine);
    if (result.success) {
      this.toastShowService.showSuccess(
        this.translateService.instant('setting.speech.stt-test-success'),
        this.translateService.instant('setting.speech.stt-test'),
      );
    } else {
      this.toastShowService.showError(
        this.translateService.instant('setting.speech.stt-test-failed'),
        this.translateService.instant('setting.speech.stt-test'),
      );
    }
  }
}
