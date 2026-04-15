// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export const MicrophoneTestDefaults = {
  LocalStorageKey: 'KLACKSY_AUDIO_INPUT_DEVICE',
  MaxRecordingDurationMs: 5000,
  LevelMeterBarCount: 10,
  LevelMeterUpdateIntervalMs: 100,
  AnalyserFftSize: 256,
} as const;
