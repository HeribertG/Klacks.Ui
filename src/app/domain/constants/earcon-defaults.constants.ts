// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SpeechDefaults } from './speech-defaults.constants';

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
