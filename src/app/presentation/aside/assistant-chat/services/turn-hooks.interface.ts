// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface TurnHooks {
  /** Cheap, idempotent: mute TTS/auto-speak immediately, regardless of the eventual cooperative outcome. */
  silence: () => void;
  /** Full local cleanup: abort the fetch stream, drain buffers, clear stage status and the explain scroll queue. */
  hardAbort: () => void;
  /** Whether the current turn's tool-call steps had already started, for the cautious-sentence rule (§3.5). */
  hadToolSteps: () => boolean;
}
