// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Recognises a failed load of a lazily imported chunk, also when zone.js has wrapped the original
 * error of an unhandled promise rejection ("Uncaught (in promise): …", original in `rejection`).
 * @param error - Anything that reached a navigation error or the global error handler
 */
import { CHUNK_LOAD_ERROR_SIGNATURES } from 'src/app/domain/constants/chunk-load-error.constants';

const MAX_REJECTION_DEPTH = 3;

export function isChunkLoadError(error: unknown): boolean {
  return collectErrorTexts(error, 0).some((text) =>
    CHUNK_LOAD_ERROR_SIGNATURES.some((signature) => text.includes(signature)),
  );
}

function collectErrorTexts(error: unknown, depth: number): string[] {
  if (typeof error === 'string') {
    return [error];
  }
  if (!error || typeof error !== 'object' || depth > MAX_REJECTION_DEPTH) {
    return [];
  }

  const candidate = error as { name?: unknown; message?: unknown; rejection?: unknown };
  const ownTexts = [candidate.name, candidate.message].filter(
    (text): text is string => typeof text === 'string',
  );

  return [...ownTexts, ...collectErrorTexts(candidate.rejection, depth + 1)];
}
