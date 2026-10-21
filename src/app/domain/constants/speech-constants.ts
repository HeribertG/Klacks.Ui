// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
