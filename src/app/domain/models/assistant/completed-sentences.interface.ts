// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Result of splitting a streamed text buffer into the sentences that are already complete.
 * @param sentences - Complete sentences, trimmed, in reading order
 * @param rest - Text after the last sentence end, still waiting for more stream content
 */
export interface CompletedSentences {
  sentences: string[];
  rest: string;
}
