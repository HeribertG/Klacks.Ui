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
 * @param bargeInEnabled - Whether the microphone stays open during voice playback so speaking interrupts Klacksy
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { firstValueFrom, timeout } from 'rxjs';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataManagementAssistantProviderService } from 'src/app/domain/services/assistant/data-management-assistant-provider.service';
import { filterModelsWithActiveProvider } from 'src/app/domain/services/assistant/assistant-model-provider-filter';
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
import { PencilIconGreyComponent } from 'src/app/presentation/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import {
  SttEngine,
  TtsProvider,
  OutputMode,
  VoiceId,
  SpeechDefaults,
} from 'src/app/domain/constants/speech-constants';

export type EditableDictionaryEntry = Omit<DictionaryEntry, 'language'> & {
  language: string;
};

@Component({
  selector: 'app-assistant-speech-settings',
  templateUrl: './assistant-speech-settings.component.html',
  styleUrls: ['./assistant-speech-settings.component.scss'],
  standalone: true,
  imports: [DecimalPipe, TranslateModule, FormsModule, FormField, NgxSliderModule, PencilIconGreyComponent, TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantSpeechSettingsComponent implements OnInit {
  private appSettingsService = inject(AppSettingsManagementService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private dataSttService = inject(DataSttService);
  private dataTtsService = inject(DataTtsService);
  private dataAssistantService = inject(DataAssistantService);
  private assistantProviderService = inject(DataManagementAssistantProviderService);
  private dataDictionaryService = inject(DataTranscriptionDictionaryService);

  private isInitialized = false;

  dictionaryEntries = signal<EditableDictionaryEntry[]>([]);
  protected dictForm = form(this.dictionaryEntries);
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

  private static readonly MinContextWindowForSpeech = 16000;
  private static readonly RecommendedCount = 3;
  private static readonly ModelCheckClientTimeoutMs = 90000;

  readonly modelCheckResults = signal<ISpeechModelCheckDto[]>([]);
  readonly isCheckingModels = signal(false);
  readonly modelCheckError = signal<string | null>(null);
  readonly recommendedModelIds = signal<Set<string>>(new Set<string>());

  readonly showTtsProvider = true;
  readonly SttEngine = SttEngine;
  readonly TtsProvider = TtsProvider;

  sttEngine = SttEngine.Browser;
  sttApiKey = '';
  sttApiKeyConfigured = false;
  private sttApiKeysByEngine: Record<string, string> = {};
  ttsVoice = VoiceId.Auto;
  ttsProvider = TtsProvider.Edge;
  ttsApiKey = '';
  ttsApiKeyConfigured = false;
  private ttsApiKeysByProvider: Record<string, string> = {};
  transcriptionModel = SpeechDefaults.TranscriptionModel;
  transcriptionPrompt = SpeechDefaults.DefaultTranscriptionPrompt;
  enhancementEnabled = true;
  outputMode = OutputMode.Both;
  silenceThresholdMs = SpeechDefaults.SilenceThresholdMs;
  bargeInEnabled = false;

  readonly silenceOptions: Options = {
    floor: SpeechDefaults.SilenceThresholdMinMs,
    ceil: SpeechDefaults.SilenceThresholdMaxMs,
    step: SpeechDefaults.SilenceThresholdStepMs,
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

  readonly customSttProviders = signal<{ value: string; label: string }[]>([]);

  readonly ttsProviders = [
    { value: TtsProvider.Edge, labelKey: 'setting.speech.tts-edge' },
    { value: TtsProvider.OpenAi, labelKey: 'setting.speech.tts-openai' },
    { value: TtsProvider.ElevenLabs, labelKey: 'setting.speech.tts-elevenlabs' },
    { value: TtsProvider.Google, labelKey: 'setting.speech.tts-google' },
  ];

  readonly outputModes = [
    { value: OutputMode.Text, labelKey: 'setting.speech.output-text-only' },
    { value: OutputMode.Both, labelKey: 'setting.speech.output-both' },
    { value: OutputMode.BothAuto, labelKey: 'setting.speech.output-both-auto' },
    { value: OutputMode.Audio, labelKey: 'setting.speech.output-audio-only' },
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
    this.ttsApiKeysByProvider = { ...speech.ttsApiKeys };
    this.applyTtsKeyToField();
    this.transcriptionModel = speech.transcriptionModel;
    this.enhancementEnabled = speech.enhancementEnabled;
    this.outputMode = speech.outputMode;
    this.silenceThresholdMs = speech.silenceThresholdMs;
    this.bargeInEnabled = speech.bargeInEnabled;
    this.isInitialized = true;
    this.transcriptionPrompt = speech.transcriptionPrompt;

    await this.loadVoices(this.ttsProvider);
    await this.loadCustomSttProviders();
    await this.loadTranscriptionModels();

    const dictEntries = await this.dataDictionaryService.getAll();
    this.dictionaryEntries.set(dictEntries.map((e) => ({ ...e, language: e.language ?? '' })));
  }

  onEngineChanged(): void {
    this.applyEngineKeyToField();
    this.onSettingChanged();
  }

  isCustomStt(): boolean {
    return SttEngine.isCustom(this.sttEngine);
  }

  private async loadTranscriptionModels(): Promise<void> {
    try {
      const [models, providers] = await Promise.all([
        firstValueFrom(this.dataAssistantService.getModels()),
        this.assistantProviderService.loadProviders(),
      ]);
      this.transcriptionModels.set(
        filterModelsWithActiveProvider(
          models.filter((m) => m.isEnabled),
          providers,
        ).map((m) => ({
          value: m.modelId,
          label: m.displayName ?? m.modelId,
        })),
      );
    } catch {
      this.transcriptionModels.set([]);
    }
  }

  private async loadCustomSttProviders(): Promise<void> {
    const providers = await this.dataSttService.getCustomProviders();
    this.customSttProviders.set(
      providers
        .filter((p) => p.isEnabled)
        .map((p) => ({
          value: `${SttEngine.CustomPrefix}${p.id}`,
          label: p.name,
        })),
    );
  }

  async onTtsProviderChange(): Promise<void> {
    this.ttsVoice = VoiceId.Auto;
    await this.loadVoices(this.ttsProvider);
    this.applyTtsKeyToField();
    this.onSettingChanged();
  }

  private async loadVoices(providerId: string): Promise<void> {
    const voices = await this.dataTtsService.getVoices(providerId);
    this.ttsVoices.set([
      { value: VoiceId.Auto, label: 'Auto' },
      ...voices.map((v) => ({
        value: v.voiceId,
        label:
          v.locale && v.locale !== VoiceId.Auto
            ? `${v.locale} - ${v.displayName}`
            : v.displayName,
      })),
    ]);
  }

  onSettingChanged(): void {
    if (!this.isInitialized) {
      return;
    }

    this.captureApiKeyForCurrentEngine();
    this.captureTtsApiKeyForCurrentProvider();

    this.appSettingsService.speechSettings.set({
      sttEngine: this.sttEngine,
      sttApiKeys: { ...this.sttApiKeysByEngine },
      ttsVoice: this.ttsVoice,
      ttsProvider: this.ttsProvider,
      ttsApiKeys: { ...this.ttsApiKeysByProvider },
      transcriptionModel: this.transcriptionModel,
      transcriptionPrompt: this.transcriptionPrompt,
      enhancementEnabled: this.enhancementEnabled,
      outputMode: this.outputMode,
      silenceThresholdMs: this.silenceThresholdMs,
      bargeInEnabled: this.bargeInEnabled,
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

  private applyTtsKeyToField(): void {
    const stored = this.ttsApiKeysByProvider[this.ttsProvider] ?? '';
    if (stored === '***') {
      this.ttsApiKeyConfigured = true;
      this.ttsApiKey = '';
    } else {
      this.ttsApiKeyConfigured = false;
      this.ttsApiKey = stored;
    }
  }

  private captureTtsApiKeyForCurrentProvider(): void {
    if (!(this.ttsProvider in this.ttsApiKeysByProvider)) {
      return;
    }
    this.ttsApiKeysByProvider[this.ttsProvider] =
      this.ttsApiKey.length > 0
        ? this.ttsApiKey
        : this.ttsApiKeyConfigured
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

  async testTtsConnection(): Promise<void> {
    await this.appSettingsService.saveImmediately();
    const result = await this.dataTtsService.testConnection(this.ttsProvider);
    if (result.success) {
      this.toastShowService.showSuccess(
        this.translateService.instant('setting.speech.tts-test-success'),
        this.translateService.instant('setting.speech.tts-test'),
      );
    } else {
      this.toastShowService.showError(
        this.translateService.instant('setting.speech.tts-test-failed'),
        this.translateService.instant('setting.speech.tts-test'),
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

  async updateDictionaryEntry(index: number): Promise<void> {
    const entry = this.dictionaryEntries()[index];
    if (!entry) {
      return;
    }
    const success = await this.dataDictionaryService.update({
      ...entry,
      language: entry.language || null,
    });
    if (success) {
      this.editingEntryId.set(null);
    }
  }

  onVariantsChange(index: number, raw: string): void {
    const variants = this.parseVariants(raw);
    this.dictionaryEntries.update((entries) =>
      entries.map((e, i) =>
        i === index ? { ...e, phoneticVariants: variants } : e,
      ),
    );
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
        this.dataAssistantService
          .checkSpeechModels()
          .pipe(
            timeout(AssistantSpeechSettingsComponent.ModelCheckClientTimeoutMs),
          ),
      );
      const sorted = this.sortModelsByScore(response.models);
      this.modelCheckResults.set(sorted);
      this.recommendedModelIds.set(this.computeRecommendedIds(sorted));
      await this.loadTranscriptionModels();
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
