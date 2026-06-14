// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect } from 'vitest';
import { resolveQualificationGlyph } from './qualification-glyph.helper';

describe('resolveQualificationGlyph', () => {
  it('returns an empty glyph for null or empty input', () => {
    expect(resolveQualificationGlyph(null)).toEqual({ text: '', isFlag: false });
    expect(resolveQualificationGlyph(undefined)).toEqual({ text: '', isFlag: false });
    expect(resolveQualificationGlyph('')).toEqual({ text: '', isFlag: false });
  });

  it('passes regular single-codepoint emojis through unchanged', () => {
    expect(resolveQualificationGlyph('💊')).toEqual({ text: '💊', isFlag: false });
    expect(resolveQualificationGlyph('🩹')).toEqual({ text: '🩹', isFlag: false });
  });

  it('converts flag emojis to their ISO country letters', () => {
    expect(resolveQualificationGlyph('🇩🇪')).toEqual({ text: 'DE', isFlag: true });
    expect(resolveQualificationGlyph('🇫🇷')).toEqual({ text: 'FR', isFlag: true });
    expect(resolveQualificationGlyph('🇮🇹')).toEqual({ text: 'IT', isFlag: true });
  });

  it('does not treat a single regional indicator as a flag', () => {
    expect(resolveQualificationGlyph('🇩')).toEqual({ text: '🇩', isFlag: false });
  });
});
