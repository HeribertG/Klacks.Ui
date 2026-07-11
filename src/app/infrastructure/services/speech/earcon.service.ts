// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Plays short synthesized confirmation tones (earcons) via the Web Audio API.
 * Tones are generated with OscillatorNode/GainNode so no audio asset or external
 * URL is needed (CSP-safe). The AudioContext is created lazily on first use and
 * reused afterwards; voice mode starts with a user gesture, so autoplay policy is satisfied.
 * @param audioContext - Lazily created, shared AudioContext for all earcons
 */
import { Injectable, OnDestroy } from '@angular/core';
import { EarconDefaults } from 'src/app/domain/constants/speech-constants';

@Injectable({ providedIn: 'root' })
export class EarconService implements OnDestroy {
  private audioContext: AudioContext | null = null;

  /**
   * Plays the "understood, thinking now" earcon: two short, quiet ascending sine tones.
   * Silently does nothing when the Web Audio API is unavailable.
   */
  playProcessingEarcon(): void {
    const context = this.getOrCreateContext();
    if (!context) {
      return;
    }
    if (context.state === 'suspended') {
      void context.resume();
    }

    let startTime = context.currentTime;
    const toneSpacingSeconds =
      (EarconDefaults.ToneDurationMs + EarconDefaults.ToneGapMs) / EarconDefaults.MillisecondsPerSecond;

    for (const frequencyHz of EarconDefaults.ProcessingToneFrequenciesHz) {
      this.scheduleTone(context, frequencyHz, startTime);
      startTime += toneSpacingSeconds;
    }
  }

  ngOnDestroy(): void {
    void this.audioContext?.close();
    this.audioContext = null;
  }

  private scheduleTone(context: AudioContext, frequencyHz: number, startTime: number): void {
    const durationSeconds = EarconDefaults.ToneDurationMs / EarconDefaults.MillisecondsPerSecond;
    const attackSeconds = EarconDefaults.AttackMs / EarconDefaults.MillisecondsPerSecond;
    const releaseSeconds = EarconDefaults.ReleaseMs / EarconDefaults.MillisecondsPerSecond;

    const oscillator = context.createOscillator();
    oscillator.type = EarconDefaults.ToneType;
    oscillator.frequency.value = frequencyHz;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(EarconDefaults.ToneGain, startTime + attackSeconds);
    gain.gain.setValueAtTime(EarconDefaults.ToneGain, startTime + durationSeconds - releaseSeconds);
    gain.gain.linearRampToValueAtTime(0, startTime + durationSeconds);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds);
  }

  private getOrCreateContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }
    if (typeof AudioContext === 'undefined') {
      return null;
    }
    try {
      this.audioContext = new AudioContext();
    } catch (err) {
      console.warn('[VS] earcon AudioContext could not be created:', err instanceof Error ? err.message : err);
      return null;
    }
    return this.audioContext;
  }
}
