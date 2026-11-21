// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Splits a streamed answer buffer into complete sentences (ending in . ! ? or the CJK/Arabic marks) and the unfinished
 * rest, so speech output can synthesize sentence by sentence while the answer is still streaming.
 */
import { CompletedSentences } from 'src/app/domain/models/assistant/completed-sentences.interface';

const SENTENCE_PATTERN = /[^.!?。！？؟]+[.!?。！？؟]\s*/g;

/**
 * @param buffer - Text received so far that has not been turned into sentences yet
 * @returns The complete sentences and the rest; the rest is the whole buffer when no sentence is complete
 */
export function splitCompletedSentences(buffer: string): CompletedSentences {
  const sentences: string[] = [];
  const pattern = new RegExp(SENTENCE_PATTERN.source, SENTENCE_PATTERN.flags);
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = pattern.exec(buffer)) !== null) {
    sentences.push(match[0].trim());
    lastIndex = match.index + match[0].length;
  }

  return { sentences, rest: sentences.length > 0 ? buffer.substring(lastIndex) : buffer };
}
