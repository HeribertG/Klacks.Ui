// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Default values of the speech/voice conversation feature (locale, transcription prompt, silence and VAD thresholds,
 * audio capture settings) and the clamp for a configured silence threshold.
 * @param value - Silence threshold in milliseconds to clamp into the allowed range
 */

import { DomainMessages } from 'src/app/domain/constants/messages';

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
