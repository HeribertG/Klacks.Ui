// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Resolves what to actually paint into a qualification bubble on a canvas.
 * Flag emojis (regional-indicator pairs such as 🇩🇪/🇫🇷) are not rendered as glyphs by
 * the Windows/Chrome canvas, so they are converted to their ISO country letters (DE/FR),
 * which the bubble draws as bold text. All other emojis are returned unchanged.
 * @param emoji - The raw qualification emoji (may be null/empty)
 */
const REGIONAL_INDICATOR_START = 0x1f1e6;
const REGIONAL_INDICATOR_END = 0x1f1ff;
const ASCII_UPPERCASE_A = 65;

export interface QualificationGlyph {
  text: string;
  isFlag: boolean;
}

export function resolveQualificationGlyph(emoji: string | null | undefined): QualificationGlyph {
  if (!emoji) {
    return { text: '', isFlag: false };
  }

  const codePoints = [...emoji];
  const isFlag =
    codePoints.length === 2 &&
    codePoints.every((char) => {
      const cp = char.codePointAt(0) ?? 0;
      return cp >= REGIONAL_INDICATOR_START && cp <= REGIONAL_INDICATOR_END;
    });

  if (isFlag) {
    const letters = codePoints
      .map((char) =>
        String.fromCharCode((char.codePointAt(0) ?? 0) - REGIONAL_INDICATOR_START + ASCII_UPPERCASE_A),
      )
      .join('');
    return { text: letters, isFlag: true };
  }

  return { text: emoji, isFlag: false };
}
