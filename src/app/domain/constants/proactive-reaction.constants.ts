// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Reaction values a user can give on a proactive assistant message.
 */
export const PROACTIVE_REACTION = {
  Helpful: 'helpful',
  Dismissed: 'dismissed',
} as const;

export type ProactiveReaction = (typeof PROACTIVE_REACTION)[keyof typeof PROACTIVE_REACTION];

/**
 * Why a user dismissed a proactive message. Sent only with a dismissal, and only meaningful when the
 * message reported a finding the backend tracks in its condition ledger. The values spell the backend
 * AgentConditionRejectReason members; NoReason is an explicit choice the user can make, not the absence
 * of one, so it travels as a value rather than as an omitted field.
 */
export const PROACTIVE_REJECT_REASON = {
  GenerallyUnwanted: 'generallyUnwanted',
  WrongThisTime: 'wrongThisTime',
  AlreadyHandled: 'alreadyHandled',
  NoReason: 'noReason',
} as const;

export type ProactiveRejectReason =
  (typeof PROACTIVE_REJECT_REASON)[keyof typeof PROACTIVE_REJECT_REASON];
