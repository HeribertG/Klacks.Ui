// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Speech feature settings for the Klacksy voice conversation pipeline.
 * @param sttEngine - Selected STT provider identifier
 * @param sttApiKeys - Per-provider API keys keyed by STT engine id (each cloud provider keeps its own key)
 * @param ttsVoice - Edge TTS voice identifier or 'auto'
 * @param ttsProvider - Selected TTS provider identifier
 * @param ttsApiKeys - Per-provider API keys keyed by TTS provider id (Edge needs none)
 * @param transcriptionModel - LLM model ID used for transcription enhancement
 * @param enhancementEnabled - Whether transcription enhancement is active
 * @param outputMode - How Klacksy responses are presented: text, audio, or both
 * @param silenceThresholdMs - Silence duration in milliseconds before auto-send
 * @param bargeInEnabled - Whether the microphone stays open during TTS playback so the user can interrupt by speaking
 */
import { SttEngine, TtsProvider, OutputMode, VoiceId, SpeechDefaults } from 'src/app/domain/constants/speech-constants';

export interface ISpeechSettings {
  sttEngine: string;
  sttApiKeys: Record<string, string>;
  ttsVoice: string;
  ttsProvider: string;
  ttsApiKeys: Record<string, string>;
  transcriptionModel: string;
  transcriptionPrompt: string;
  enhancementEnabled: boolean;
  outputMode: string;
  silenceThresholdMs: number;
  bargeInEnabled: boolean;
}

export function createEmptySttApiKeys(): Record<string, string> {
  return {
    [SttEngine.Deepgram]: '',
    [SttEngine.GroqWhisper]: '',
    [SttEngine.AssemblyAi]: '',
  };
}

export function createEmptyTtsApiKeys(): Record<string, string> {
  return {
    [TtsProvider.OpenAi]: '',
    [TtsProvider.ElevenLabs]: '',
    [TtsProvider.Google]: '',
  };
}

export class SpeechSettings implements ISpeechSettings {
  sttEngine = SttEngine.Browser;
  sttApiKeys = createEmptySttApiKeys();
  ttsVoice = VoiceId.Auto;
  ttsProvider = TtsProvider.Edge;
  ttsApiKeys = createEmptyTtsApiKeys();
  transcriptionModel = SpeechDefaults.TranscriptionModel;
  transcriptionPrompt = SpeechDefaults.DefaultTranscriptionPrompt;
  enhancementEnabled = true;
  outputMode = OutputMode.Both;
  silenceThresholdMs = SpeechDefaults.SilenceThresholdMs;
  bargeInEnabled = false;
}
