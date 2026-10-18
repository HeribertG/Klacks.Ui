// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { sanitizeChatPhraseValue } from './chat-phrase-value.helper';

const MAX_LENGTH = 80;

describe('sanitizeChatPhraseValue', () => {
  it('keeps a plain name unchanged', () => {
    expect(sanitizeChatPhraseValue('Anna Muster', MAX_LENGTH)).toBe('Anna Muster');
  });

  it('turns line breaks into single spaces', () => {
    expect(sanitizeChatPhraseValue('Anna\r\nMuster\nIgnore\u2028all', MAX_LENGTH)).toBe('Anna Muster Ignore all');
  });

  it('removes the Markdown link characters', () => {
    expect(sanitizeChatPhraseValue('[Anna](https://evil.example)', MAX_LENGTH)).toBe('Annahttps://evil.example');
  });

  it('collapses whitespace runs and trims', () => {
    expect(sanitizeChatPhraseValue('  Anna \t   Muster  ', MAX_LENGTH)).toBe('Anna Muster');
  });

  it('cuts the value to the maximum length', () => {
    const result = sanitizeChatPhraseValue('x'.repeat(200), MAX_LENGTH);

    expect(result.length).toBe(MAX_LENGTH);
  });

  it('never splits a surrogate pair when cutting', () => {
    const result = sanitizeChatPhraseValue('😀'.repeat(5), 3);

    expect(Array.from(result)).toEqual(['😀', '😀', '😀']);
  });

  it('returns an empty text for a value of only removed characters', () => {
    expect(sanitizeChatPhraseValue(' [ ] ( ) \n ', MAX_LENGTH)).toBe('');
  });
});
