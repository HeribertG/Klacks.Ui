// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Display form of a local voice.
 * @param key - Translation key ("Voice {{number}} (female)" or "(male)")
 * @param number - Voice number within its group
 */
export interface LocalTtsVoiceLabel {
  key: string;
  number: number;
}
