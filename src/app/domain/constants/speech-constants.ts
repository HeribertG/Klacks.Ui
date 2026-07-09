// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Constants for the speech/voice conversation feature.
 */
export class SttEngine {
  static readonly Browser = 'browser';
  static readonly Deepgram = 'deepgram';
  static readonly GroqWhisper = 'groq-whisper';
  static readonly AssemblyAi = 'assemblyai';
  static readonly CustomPrefix = 'custom:';

  static isCustom(engine: string): boolean {
    return engine.startsWith(SttEngine.CustomPrefix);
  }
}

export class TtsProvider {
  static readonly Edge = 'edge';
  static readonly OpenAi = 'openai';
  static readonly ElevenLabs = 'elevenlabs';
  static readonly Google = 'google-tts';
}

export class OutputMode {
  static readonly Text = 'text';
  static readonly Audio = 'audio';
  static readonly Both = 'both';
  static readonly BothAuto = 'both-auto';
}

export class VoiceId {
  static readonly Auto = 'auto';
}

export class SpeechDefaults {
  static readonly Locale = 'de';
  static readonly TranscriptionModel = 'deepseek-chat';
  static readonly DefaultTranscriptionPrompt = `You are a transcription enhancer. Clean up the following speech-to-text output:
- Remove filler words (um, uh, like, also, ähm, halt, sozusagen)
- Apply self-corrections: if the speaker corrects themselves, keep only the corrected version
- Fix grammar and punctuation
- Format numbers properly
- Preserve the original meaning and tone
- Output ONLY the cleaned text, nothing else
- Keep the same language as the input
{0}`;
  static readonly SilenceThresholdMs = 1500;
  static readonly VadThreshold = 0.01;
  static readonly SampleRate = 16000;
  static readonly ChannelCount = 1;
  static readonly AudioProcessorBufferSize = 4096;
  static readonly BargeInMinSpeechDurationMs = 400;
  static readonly BargeInVadThresholdMultiplier = 2.5;
}

export class NonSpeechDefaults {
  static readonly Phrases: readonly string[] = [
    'musik',
    'music',
    'applaus',
    'applause',
    'gelächter',
    'laughter',
    'amara.org',
    'untertitel der amara.org-community',
    'untertitelung des zdf für funk',
    'untertitel im auftrag des zdf',
  ];
}
