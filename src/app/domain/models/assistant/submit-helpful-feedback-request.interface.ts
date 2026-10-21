// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISubmitHelpfulFeedbackRequest {
  userMessage: string;

  /** Id of the judged turn; omitted when unknown, which makes the server fall back to the message-hash lookup. */
  turnId?: string;

  /** Absent means thumbs-up; false marks the turn as not helpful (W1.8). */
  helpful?: boolean;

  /** Optional free text the user typed with a thumbs-down. */
  comment?: string;
}
