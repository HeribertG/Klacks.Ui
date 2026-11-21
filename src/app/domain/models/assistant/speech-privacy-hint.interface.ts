// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Which speech services receive plain text while the LLM pseudonymisation is on.
 * @param tts - True when the speech output provider is not the local one
 * @param stt - True when the speech input engine is the browser, a cloud provider or a custom server
 */
export interface SpeechPrivacyHint {
  tts: boolean;
  stt: boolean;
}
