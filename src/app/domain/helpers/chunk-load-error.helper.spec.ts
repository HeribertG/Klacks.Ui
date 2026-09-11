// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { isChunkLoadError } from './chunk-load-error.helper';

const CHUNK_URL = 'https://klacks.example/chunk-7QX2LMNB.js';

describe('isChunkLoadError', () => {
  it.each([
    ['Chrome and Edge', new TypeError(`Failed to fetch dynamically imported module: ${CHUNK_URL}`)],
    ['Safari', new TypeError('Importing a module script failed.')],
    ['Firefox', new TypeError(`error loading dynamically imported module: ${CHUNK_URL}`)],
  ])('recognises the %s message', (_browser, error) => {
    expect(isChunkLoadError(error)).toBe(true);
  });

  it('recognises a bundler ChunkLoadError by its name', () => {
    const error = new Error('Loading chunk 42 failed.');
    error.name = 'ChunkLoadError';

    expect(isChunkLoadError(error)).toBe(true);
  });

  it('looks through the zone.js wrapper of an unhandled promise rejection', () => {
    const wrapper = Object.assign(new Error('Uncaught (in promise): [object Object]'), {
      rejection: new TypeError(`Failed to fetch dynamically imported module: ${CHUNK_URL}`),
    });

    expect(isChunkLoadError(wrapper)).toBe(true);
  });

  it('recognises a plain string message', () => {
    expect(isChunkLoadError(`Failed to fetch dynamically imported module: ${CHUNK_URL}`)).toBe(true);
  });

  it.each([
    ['an ordinary error', new Error('Cannot read properties of undefined')],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
  ])('ignores %s', (_label, error) => {
    expect(isChunkLoadError(error)).toBe(false);
  });

  it('stops at a rejection that refers to itself', () => {
    const selfReferencing: { message: string; rejection?: unknown } = { message: 'loop' };
    selfReferencing.rejection = selfReferencing;

    expect(isChunkLoadError(selfReferencing)).toBe(false);
  });
});
