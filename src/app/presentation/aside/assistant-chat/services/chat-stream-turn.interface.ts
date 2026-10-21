// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IChatStreamTurn {
  /** The assistant message the streamed answer is written into. */
  assistantMessageId: string;
  /** Turn sequence number from ChatTurnControlService.beginTurn. */
  turnSeq: number;
  /** Whether this turn was stopped; captured at turn start, see ChatTurnControlService.captureCancellation. */
  isStopped: () => boolean;
  /** The user's text exactly as sent, untrimmed. */
  messageText: string;
}
