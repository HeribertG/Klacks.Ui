// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { DomainMessages } from 'src/app/domain/constants/messages';

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
  static readonly Locale = DomainMessages.DEFAULT_LANG;
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
  static readonly SilenceThresholdMs = 1000;
  static readonly SilenceThresholdMinMs = 500;
  static readonly SilenceThresholdMaxMs = 3000;
  static readonly SilenceThresholdStepMs = 100;
  static readonly VadThreshold = 0.01;
  static readonly VadReleaseFactor = 0.35;
  static readonly PreRollDurationMs = 400;
  static readonly SampleRate = 16000;
  static readonly ChannelCount = 1;
  static readonly AudioProcessorBufferSize = 4096;
  static readonly BargeInMinSpeechDurationMs = 400;
  static readonly BargeInVadThresholdMultiplier = 2.5;
  static readonly MinBlobBytes = 1000;
  static readonly InterimTranscriptionIntervalMs = 2000;
  static readonly SentenceGapMs = 240;
  static readonly InterimTranscriptionMaxAudioMs = 30000;
  static readonly MillisecondsPerSecond = 1000;

  /**
   * Clamps a silence threshold to the supported range; non-finite input falls back to the default.
   * @param value - Silence threshold candidate in milliseconds
   */
  static clampSilenceThresholdMs(value: number): number {
    if (!Number.isFinite(value)) {
      return SpeechDefaults.SilenceThresholdMs;
    }
    return Math.min(SpeechDefaults.SilenceThresholdMaxMs, Math.max(SpeechDefaults.SilenceThresholdMinMs, value));
  }
}

/**
 * Constants for the synthesized confirmation earcon played when Klacksy starts thinking.
 * Two short ascending sine tones with a soft attack/release envelope to avoid clicks.
 */
export class EarconDefaults {
  static readonly ProcessingToneFrequenciesHz: readonly number[] = [440, 660];
  static readonly ToneDurationMs = 70;
  static readonly ToneGapMs = 30;
  static readonly ToneGain = 0.06;
  static readonly AttackMs = 10;
  static readonly ReleaseMs = 25;
  static readonly ToneType: OscillatorType = 'sine';
  static readonly MillisecondsPerSecond = SpeechDefaults.MillisecondsPerSecond;
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
