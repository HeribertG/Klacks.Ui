// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings component for configuring Klacksy speech preferences.
 * @param sttEngine - Selected speech-to-text engine
 * @param sttApiKey - Editable API key field for the currently selected STT provider
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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { firstValueFrom } from 'rxjs';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataSttService } from 'src/app/infrastructure/api/assistant/data-stt.service';
import { DataTtsService } from 'src/app/infrastructure/api/assistant/data-tts.service';
import {
  DataAssistantService,
  ISpeechModelCheckDto,
} from 'src/app/infrastructure/api/assistant/data-assistant.service';
import {
  DataTranscriptionDictionaryService,
  DictionaryEntry,
} from 'src/app/infrastructure/api/assistant/data-transcription-dictionary.service';
import {
  DataCustomSttProviderService,
  CustomSttProvider,
} from 'src/app/infrastructure/api/assistant/data-custom-stt-provider.service';
import { CustomSttProviderModalComponent } from './custom-stt-provider-modal/custom-stt-provider-modal.component';
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
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
  imports: [CommonModule, TranslateModule, FormsModule, NgxSliderModule, CustomSttProviderModalComponent, PencilIconGreyComponent, TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantSpeechSettingsComponent implements OnInit {
  private appSettingsService = inject(AppSettingsManagementService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private dataSttService = inject(DataSttService);
  private dataTtsService = inject(DataTtsService);
  private dataAssistantService = inject(DataAssistantService);
  private dataDictionaryService = inject(DataTranscriptionDictionaryService);
  private dataCustomSttService = inject(DataCustomSttProviderService);

  private isInitialized = false;

  dictionaryEntries = signal<DictionaryEntry[]>([]);
  newEntry: Partial<DictionaryEntry> = {
    correctTerm: '',
    category: '',
    phoneticVariants: [],
    description: '',
    language: '',
  };
  editingEntryId = signal<string | null>(null);

  readonly dictionaryLanguages: { value: string; label: string }[] = [
    { value: '', label: 'Auto' },
    { value: 'de', label: 'DE' },
    { value: 'en', label: 'EN' },
    { value: 'fr', label: 'FR' },
    { value: 'it', label: 'IT' },
  ];

  customSttProviders = signal<CustomSttProvider[]>([]);
  showSttModal = signal(false);
  editingSttProvider = signal<CustomSttProvider | null>(null);

  private static readonly MinContextWindowForSpeech = 16000;
  private static readonly RecommendedCount = 3;

  readonly modelCheckResults = signal<ISpeechModelCheckDto[]>([]);
  readonly isCheckingModels = signal(false);
  readonly modelCheckError = signal<string | null>(null);
  readonly recommendedModelIds = signal<Set<string>>(new Set<string>());

  // Hide TTS provider picker until OpenAI/ElevenLabs backend providers are implemented.
  readonly showTtsProvider = false;

  sttEngine = SttEngine.Browser;
  sttApiKey = '';
  sttApiKeyConfigured = false;
  private sttApiKeysByEngine: Record<string, string> = {};
  ttsVoice = VoiceId.Auto;
  ttsProvider = TtsProvider.Edge;
  transcriptionModel = SpeechDefaults.TranscriptionModel;
  transcriptionPrompt = SpeechDefaults.DefaultTranscriptionPrompt;
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
    this.sttApiKeysByEngine = { ...speech.sttApiKeys };
    this.applyEngineKeyToField();
    this.ttsVoice = speech.ttsVoice;
    this.ttsProvider = this.showTtsProvider ? speech.ttsProvider : TtsProvider.Edge;
    this.transcriptionModel = speech.transcriptionModel;
    this.enhancementEnabled = speech.enhancementEnabled;
    this.outputMode = speech.outputMode;
    this.silenceThresholdMs = speech.silenceThresholdMs;
    this.isInitialized = true;
    this.transcriptionPrompt = speech.transcriptionPrompt;

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

    const dictEntries = await this.dataDictionaryService.getAll();
    this.dictionaryEntries.set(dictEntries.map((e) => ({ ...e, language: e.language ?? '' })));
    this.customSttProviders.set(await this.dataCustomSttService.getAll());
  }

  onEngineChanged(): void {
    this.applyEngineKeyToField();
    this.onSettingChanged();
  }

  onSettingChanged(): void {
    if (!this.isInitialized) {
      return;
    }

    this.captureApiKeyForCurrentEngine();

    this.appSettingsService.speechSettings.set({
      sttEngine: this.sttEngine,
      sttApiKeys: { ...this.sttApiKeysByEngine },
      ttsVoice: this.ttsVoice,
      ttsProvider: this.ttsProvider,
      transcriptionModel: this.transcriptionModel,
      transcriptionPrompt: this.transcriptionPrompt,
      enhancementEnabled: this.enhancementEnabled,
      outputMode: this.outputMode,
      silenceThresholdMs: this.silenceThresholdMs,
    });
  }

  private applyEngineKeyToField(): void {
    const stored = this.sttApiKeysByEngine[this.sttEngine] ?? '';
    if (stored === '***') {
      this.sttApiKeyConfigured = true;
      this.sttApiKey = '';
    } else {
      this.sttApiKeyConfigured = false;
      this.sttApiKey = stored;
    }
  }

  private captureApiKeyForCurrentEngine(): void {
    if (!(this.sttEngine in this.sttApiKeysByEngine)) {
      return;
    }
    this.sttApiKeysByEngine[this.sttEngine] =
      this.sttApiKey.length > 0
        ? this.sttApiKey
        : this.sttApiKeyConfigured
          ? '***'
          : '';
  }

  resetPrompt(): void {
    this.transcriptionPrompt = SpeechDefaults.DefaultTranscriptionPrompt;
    this.onSettingChanged();
  }

  async testSttConnection(): Promise<void> {
    await this.appSettingsService.saveImmediately();
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

  async addDictionaryEntry(): Promise<void> {
    if (!this.newEntry.correctTerm?.trim()) return;
    const created = await this.dataDictionaryService.create({
      correctTerm: this.newEntry.correctTerm!,
      category: this.newEntry.category || null,
      phoneticVariants: this.newEntry.phoneticVariants || [],
      description: this.newEntry.description || null,
      language: this.newEntry.language || null,
    });
    if (created) {
      this.dictionaryEntries.set([
        ...this.dictionaryEntries(),
        { ...created, language: created.language ?? '' },
      ]);
      this.newEntry = {
        correctTerm: '',
        category: '',
        phoneticVariants: [],
        description: '',
        language: '',
      };
    }
  }

  async updateDictionaryEntry(entry: DictionaryEntry): Promise<void> {
    const success = await this.dataDictionaryService.update({
      ...entry,
      language: entry.language || null,
    });
    if (success) {
      this.editingEntryId.set(null);
    }
  }

  async deleteDictionaryEntry(id: string): Promise<void> {
    const success = await this.dataDictionaryService.delete(id);
    if (success) {
      this.dictionaryEntries.set(
        this.dictionaryEntries().filter((e) => e.id !== id),
      );
    }
  }

  parseVariants(input: string): string[] {
    return input
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  formatVariants(variants: string[]): string {
    return variants.join(', ');
  }

  openNewSttProvider(): void {
    this.editingSttProvider.set(null);
    this.showSttModal.set(true);
  }

  openEditSttProvider(provider: CustomSttProvider): void {
    this.editingSttProvider.set(provider);
    this.showSttModal.set(true);
  }

  async onSttProviderSaved(provider: CustomSttProvider): Promise<void> {
    if (provider.id) {
      await this.dataCustomSttService.update(provider);
    } else {
      await this.dataCustomSttService.create(provider);
    }
    this.customSttProviders.set(await this.dataCustomSttService.getAll());
    this.showSttModal.set(false);
  }

  async deleteSttProvider(id: string): Promise<void> {
    await this.dataCustomSttService.delete(id);
    this.customSttProviders.set(await this.dataCustomSttService.getAll());
  }

  async toggleSttProvider(provider: CustomSttProvider): Promise<void> {
    provider.isEnabled = !provider.isEnabled;
    await this.dataCustomSttService.update(provider);
  }

  async onCheckBestModels(): Promise<void> {
    if (this.isCheckingModels()) {
      return;
    }
    this.isCheckingModels.set(true);
    this.modelCheckError.set(null);
    this.modelCheckResults.set([]);
    this.recommendedModelIds.set(new Set<string>());
    try {
      const response = await firstValueFrom(
        this.dataAssistantService.checkSpeechModels(),
      );
      const sorted = this.sortModelsByScore(response.models);
      this.modelCheckResults.set(sorted);
      this.recommendedModelIds.set(this.computeRecommendedIds(sorted));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.modelCheckError.set(message);
    } finally {
      this.isCheckingModels.set(false);
    }
  }

  selectTranscriptionModel(modelId: string): void {
    this.transcriptionModel = modelId;
    this.onSettingChanged();
  }

  isModelRecommended(modelId: string): boolean {
    return this.recommendedModelIds().has(modelId);
  }

  isModelFree(model: ISpeechModelCheckDto): boolean {
    return model.costPerInputToken === 0 && model.costPerOutputToken === 0;
  }

  qualifiesForSpeech(model: ISpeechModelCheckDto): boolean {
    return (
      model.isHealthy &&
      model.contextWindow >= AssistantSpeechSettingsComponent.MinContextWindowForSpeech
    );
  }

  private sortModelsByScore(
    models: readonly ISpeechModelCheckDto[],
  ): ISpeechModelCheckDto[] {
    return [...models].sort((a, b) => {
      const aQualified = this.qualifiesForSpeech(a);
      const bQualified = this.qualifiesForSpeech(b);
      if (aQualified !== bQualified) {
        return aQualified ? -1 : 1;
      }
      const aCost = a.costPerInputToken + a.costPerOutputToken;
      const bCost = b.costPerInputToken + b.costPerOutputToken;
      if (aCost !== bCost) {
        return aCost - bCost;
      }
      if (a.latencyMs !== b.latencyMs) {
        return a.latencyMs - b.latencyMs;
      }
      return b.contextWindow - a.contextWindow;
    });
  }

  private computeRecommendedIds(
    sorted: readonly ISpeechModelCheckDto[],
  ): Set<string> {
    const ids = new Set<string>();
    for (const model of sorted) {
      if (ids.size >= AssistantSpeechSettingsComponent.RecommendedCount) {
        break;
      }
      if (this.qualifiesForSpeech(model)) {
        ids.add(model.modelId);
      }
    }
    return ids;
  }
}
