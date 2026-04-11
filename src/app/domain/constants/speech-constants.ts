// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Constants for the speech/voice conversation feature.
 */
export class SttEngine {
  static readonly Browser = 'browser';
  static readonly Deepgram = 'deepgram';
  static readonly GroqWhisper = 'groq-whisper';
  static readonly AssemblyAi = 'assemblyai';
}

export class TtsProvider {
  static readonly Edge = 'edge';
  static readonly OpenAi = 'openai';
  static readonly ElevenLabs = 'elevenlabs';
}

export class OutputMode {
  static readonly Text = 'text';
  static readonly Audio = 'audio';
  static readonly Both = 'both';
}

export class VoiceId {
  static readonly Auto = 'auto';
}

export class SpeechDefaults {
  static readonly Locale = 'de';
  static readonly TranscriptionModel = 'deepseek-chat';
  static readonly SilenceThresholdMs = 1500;
  static readonly VadThreshold = 0.01;
  static readonly SampleRate = 16000;
  static readonly ChannelCount = 1;
  static readonly AudioProcessorBufferSize = 4096;
}
