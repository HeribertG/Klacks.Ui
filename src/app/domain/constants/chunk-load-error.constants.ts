// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Texts that browsers and bundlers report when a lazily imported chunk of the running bundle no
 * longer exists on the server, typically because a newer build replaced it: Chrome/Edge, Safari,
 * Firefox, and the error name of webpack-style chunk loaders.
 */
export const CHUNK_LOAD_ERROR_SIGNATURES: readonly string[] = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'ChunkLoadError',
];
