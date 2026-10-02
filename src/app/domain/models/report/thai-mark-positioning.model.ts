// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pre-positions Thai combining marks for jsPDF, which cannot run the OpenType rules that lift a tone mark
 * above an upper vowel or move marks left of a tall consonant. The embedded Noto Sans Thai files map the
 * correctly placed glyph variants to private-use code points (tools/fonts/add-thai-pdf-mark-variants.py,
 * same table), and this model substitutes them in the text before it is drawn.
 * @param text - Thai text in logical order
 */

const TONE_MARKS: readonly number[] = [0x0e48, 0x0e49, 0x0e4a, 0x0e4b, 0x0e4c];
const UPPER_VOWELS: readonly number[] = [0x0e31, 0x0e34, 0x0e35, 0x0e36, 0x0e37, 0x0e47, 0x0e4d];
const TALL_CONSONANTS: ReadonlySet<number> = new Set([0x0e1b, 0x0e1d, 0x0e1f, 0x0e2c]);

const RAISED_TONE_START = 0xf880;
const NARROW_UPPER_VOWEL_START = 0xf885;
const NARROW_TONE_START = 0xf88c;

const THAI_BLOCK_START = 0x0e00;
const THAI_BLOCK_END = 0x0e7f;

function buildSubstitutes(start: number, originals: readonly number[]): ReadonlyMap<number, number> {
  return new Map(originals.map((code, index) => [code, start + index]));
}

const RAISED_TONES = buildSubstitutes(RAISED_TONE_START, TONE_MARKS);
const NARROW_TONES = buildSubstitutes(NARROW_TONE_START, TONE_MARKS);
const NARROW_UPPER_VOWELS = buildSubstitutes(NARROW_UPPER_VOWEL_START, UPPER_VOWELS);
const UPPER_VOWEL_SET: ReadonlySet<number> = new Set(UPPER_VOWELS);

/**
 * Maps every private-use substitute back to the Thai character it stands for, so the PDF text layer
 * (ToUnicode) still yields the real text when it is copied or searched.
 */
export const THAI_MARK_SUBSTITUTE_ORIGINALS: ReadonlyMap<number, number> = new Map(
  [RAISED_TONES, NARROW_TONES, NARROW_UPPER_VOWELS].flatMap(map =>
    [...map].map(([original, substitute]) => [substitute, original] as [number, number])
  )
);

export function containsThai(text: string): boolean {
  for (const char of text ?? '') {
    const code = char.codePointAt(0) ?? 0;
    if (code >= THAI_BLOCK_START && code <= THAI_BLOCK_END) {
      return true;
    }
  }
  return false;
}

export function positionThaiMarks(text: string): string {
  if (!containsThai(text)) {
    return text;
  }

  const codes = [...text].map(char => char.codePointAt(0) ?? 0);
  const result = codes.map((code, index) => {
    const previous = index > 0 ? codes[index - 1] : undefined;
    if (previous === undefined) {
      return code;
    }
    if (UPPER_VOWEL_SET.has(previous) && RAISED_TONES.has(code)) {
      return RAISED_TONES.get(code)!;
    }
    if (TALL_CONSONANTS.has(previous)) {
      return NARROW_TONES.get(code) ?? NARROW_UPPER_VOWELS.get(code) ?? code;
    }
    return code;
  });
  return String.fromCodePoint(...result);
}
