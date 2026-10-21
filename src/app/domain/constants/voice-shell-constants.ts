// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Static constants for the Klacksy voice-only shell UI.
 * Centralizes colors, animation durations, timing thresholds, and CSS class names
 * so the component templates, SCSS, and tests stay in sync.
 */

export class VoiceShellClass {
  static readonly Root = 'voice-shell';
  static readonly StateIdle = 'state-idle';
  static readonly StateListening = 'state-listening';
  static readonly StateEnhancing = 'state-enhancing';
  static readonly StateProcessing = 'state-processing';
  static readonly StatePlanning = 'state-planning';
  static readonly StateSpeaking = 'state-speaking';
  static readonly ErrorActive = 'error-active';
  static readonly ErrorPersistent = 'error-persistent';
}
