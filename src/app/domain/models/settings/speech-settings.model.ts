// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Speech feature settings for the Klacksy voice conversation pipeline.
 * @param sttEngine - Selected STT provider identifier
 * @param sttApiKey - API key for cloud STT providers (empty for browser)
 * @param ttsVoice - Edge TTS voice identifier or 'auto'
 * @param ttsProvider - Selected TTS provider identifier
 * @param transcriptionModel - LLM model ID used for transcription enhancement
 * @param enhancementEnabled - Whether transcription enhancement is active
 * @param outputMode - How Klacksy responses are presented: text, audio, or both
 * @param silenceThresholdMs - Silence duration in milliseconds before auto-send
 */
export interface ISpeechSettings {
  sttEngine: string;
  sttApiKey: string;
  ttsVoice: string;
  ttsProvider: string;
  transcriptionModel: string;
  enhancementEnabled: boolean;
  outputMode: string;
  silenceThresholdMs: number;
}

export class SpeechSettings implements ISpeechSettings {
  sttEngine = 'browser';
  sttApiKey = '';
  ttsVoice = 'auto';
  ttsProvider = 'edge';
  transcriptionModel = 'deepseek-chat';
  enhancementEnabled = true;
  outputMode = 'both';
  silenceThresholdMs = 1500;
}
