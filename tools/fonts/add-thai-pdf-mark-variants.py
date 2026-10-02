# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

"""
Maps the positional Thai mark variants of Noto Sans Thai to private-use code points.

jsPDF cannot apply the OpenType GSUB/GPOS rules that move a tone mark above an upper vowel or shift
marks left of a tall consonant, so the marks collide. The font already contains the correctly placed
glyphs (".small" tone marks, ".narrow" marks); this script only adds cmap entries for them, so the
PDF text pipeline can select them by code point (see thai-mark-positioning.model.ts, same table).

Usage: python tools/fonts/add-thai-pdf-mark-variants.py src/assets/fonts/NotoSansThai-Regular.ttf ...
Requires fontTools. The script is idempotent.
"""

import sys

from fontTools.ttLib import TTFont

TONE_MARKS = [0x0E48, 0x0E49, 0x0E4A, 0x0E4B, 0x0E4C]
UPPER_VOWELS = [0x0E31, 0x0E34, 0x0E35, 0x0E36, 0x0E37, 0x0E47, 0x0E4D]

RAISED_TONE_START = 0xF880
NARROW_UPPER_VOWEL_START = 0xF885
NARROW_TONE_START = 0xF88C

RAISED_SUFFIX = ".small"
NARROW_SUFFIX = ".narrow"


def build_mapping(glyph_order):
    mapping = {}
    for index, code in enumerate(TONE_MARKS):
        mapping[RAISED_TONE_START + index] = "uni%04X%s" % (code, RAISED_SUFFIX)
        mapping[NARROW_TONE_START + index] = "uni%04X%s" % (code, NARROW_SUFFIX)
    for index, code in enumerate(UPPER_VOWELS):
        mapping[NARROW_UPPER_VOWEL_START + index] = "uni%04X%s" % (code, NARROW_SUFFIX)
    missing = [name for name in mapping.values() if name not in glyph_order]
    if missing:
        raise SystemExit("glyphs not found: %s" % ", ".join(missing))
    return mapping


def patch(path):
    font = TTFont(path)
    mapping = build_mapping(set(font.getGlyphOrder()))
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap.update(mapping)
    font.save(path)
    print("%s: %d private-use entries" % (path, len(mapping)))


if __name__ == "__main__":
    for font_path in sys.argv[1:]:
        patch(font_path)
