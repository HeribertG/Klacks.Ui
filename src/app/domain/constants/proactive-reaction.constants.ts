// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Reaction values a user can give on a proactive assistant message.
 */
export const PROACTIVE_REACTION = {
  Helpful: 'helpful',
  Dismissed: 'dismissed',
} as const;

export type ProactiveReaction = (typeof PROACTIVE_REACTION)[keyof typeof PROACTIVE_REACTION];
