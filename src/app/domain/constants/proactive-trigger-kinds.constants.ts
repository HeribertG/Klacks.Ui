// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Trigger kinds of proactive assistant messages that the chat UI treats specially,
 * plus the content-params key carrying the trigger kind a mute suggestion refers to.
 */
export const PROACTIVE_TRIGGER_KIND = {
  MuteSuggestion: 'mute_suggestion',
  NoScheduleYet: 'no_schedule_yet',
} as const;

export const MUTE_SUGGESTION_KIND_PARAM = 'kind';
