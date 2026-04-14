// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Static constants for the Klacksy voice-only shell UI.
 * Centralizes colors, animation durations, timing thresholds, and CSS class names
 * so the component templates, SCSS, and tests stay in sync.
 */

export class VoiceShellColors {
  static readonly Idle = '#94a3b8';
  static readonly Listening = '#007bff';
  static readonly Processing = '#f59e0b';
  static readonly Speaking = '#10b981';
  static readonly Error = '#ef4444';
  static readonly CloseButtonBg = '#475569';
  static readonly CloseButtonBgHover = '#1e293b';
}

export class VoiceShellClass {
  static readonly Root = 'voice-shell';
  static readonly StateIdle = 'state-idle';
  static readonly StateListening = 'state-listening';
  static readonly StateEnhancing = 'state-enhancing';
  static readonly StateProcessing = 'state-processing';
  static readonly StateSpeaking = 'state-speaking';
  static readonly ErrorActive = 'error-active';
  static readonly ErrorPersistent = 'error-persistent';
}

export class VoiceShellTiming {
  static readonly ErrorBlinkMs = 3000;
  static readonly ErrorBlinkStepMs = 300;
  static readonly ErrorBlinkIterations = 10;
  static readonly LongPressMs = 500;
  static readonly PulseDurationMs = 1500;
  static readonly SpinDurationMs = 1200;
  static readonly WaveBarDurationMs = 900;
}

export class VoiceShellLayout {
  static readonly OffsetTopPx = 70;
  static readonly OffsetRightPx = 16;
  static readonly IconSizePx = 56;
  static readonly CloseButtonSizePx = 16;
  static readonly TranscriptMaxMessages = 20;
  static readonly TranscriptMaxWidthPx = 360;
}
