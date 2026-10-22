// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants for the speech/voice conversation feature.
 * SttEngine.Local is a UI-only dropdown value; the persisted engine of the local speech recognition is LocalPluginEngine.
 */
import { LocalSttPlugin } from './local-stt-plugin.constants';

export const SttErrorCodes = {
  UnsupportedLanguage: 'unsupported_language',
} as const;

export class SttEngine {
  static readonly Browser = 'browser';
  static readonly Deepgram = 'deepgram';
  static readonly GroqWhisper = 'groq-whisper';
  static readonly AssemblyAi = 'assemblyai';
  static readonly CustomPrefix = 'custom:';
  static readonly Local = 'local';
  static readonly LocalPluginEngine = `${SttEngine.CustomPrefix}${LocalSttPlugin.ProviderId}`;

  static isCustom(engine: string): boolean {
    return engine.startsWith(SttEngine.CustomPrefix);
  }

  static isLocalPlugin(engine: string): boolean {
    return engine.toLowerCase() === SttEngine.LocalPluginEngine;
  }
}
