// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Signal Pulse Helper
 *
 * Schedules the delayed half of the "flip a boolean signal true, then back
 * to false after a short delay" pattern used to pulse UI state (e.g. a brief
 * read/reset indicator) without introducing a persistent subscription.
 */
import { WritableSignal } from '@angular/core';

export const DEFAULT_SIGNAL_PULSE_RESET_DELAY_MS = 100;

/**
 * Resets the given boolean signal to false after the given delay.
 *
 * @param signal - Signal that was previously set to true
 * @param delayMs - Delay before the signal is reset to false
 */
export function resetSignalAfterDelay(
  signal: WritableSignal<boolean>,
  delayMs: number = DEFAULT_SIGNAL_PULSE_RESET_DELAY_MS
): void {
  setTimeout(() => signal.set(false), delayMs);
}
