# Report fonts

Embedded TrueType fonts for every client-side PDF export: the report designer (`ReportFontService`) and all
jsPDF exports such as route, container template, schedule, timeline, shift, Gantt, inbox and error lists
(`PdfUnicodeTextService`, which also handles bidi order for Hebrew/Arabic and Thai mark positions).

The built-in jsPDF fonts (Helvetica, Times, Courier) only cover the WinAnsi character set.
Every character outside that range is silently dropped, which made reports unusable for the
Czech, Polish, Romanian, Vietnamese, Greek, Hebrew, Arabic, Thai, Japanese, Korean and
Chinese language packs. These fonts close that gap.

| File | Covers |
|---|---|
| `NotoSans-Regular.ttf` / `NotoSans-Bold.ttf` | Latin (incl. Extended-A and Vietnamese), Greek, Cyrillic |
| `NotoSansHebrew-Regular.ttf` / `-Bold.ttf` | Hebrew + basic Latin |
| `NotoSansArabic-Regular.ttf` / `-Bold.ttf` | Arabic + basic Latin |
| `NotoSansThai-Regular.ttf` / `-Bold.ttf` | Thai + basic Latin |
| `NotoSansJP-Regular.ttf` | Japanese (Kana + Kanji) |
| `NotoSansKR-Regular.ttf` | Korean (Hangul + Hanja) |
| `NotoSansSC-Regular.ttf` | Chinese simplified (also covers traditional Han) |
| `NotoSansTC-Regular.ttf` | Chinese traditional |

The files are loaded lazily over HTTP by `DataReportFontService`, so they never enter the
application bundle. jsPDF embeds a reduced font program per registered style (measured: about 270 KB per
style for Chinese, 110 KB for Noto Sans, 50 KB for Arabic, 15 KB for Thai).

## Origin

Google Noto fonts, licensed under the SIL Open Font License 1.1 (see `OFL.txt`).
Source: <https://github.com/google/fonts> and <https://github.com/notofonts>.

The upstream files are variable fonts. They were instantiated to static weights with
`fontTools.varLib.instancer` (`wght=400` for regular, `wght=700` for bold, `wdth=100` where the
axis exists), which removes the variation tables jsPDF cannot interpret and roughly halves the
CJK file sizes.

## Modification: Thai mark variants

jsPDF cannot apply OpenType GSUB/GPOS, so a Thai tone mark after an upper vowel (เมื่อ, เริ่ม) would collide
with the vowel, and marks over tall consonants (ป ฝ ฟ ฬ) would hit the ascender. Noto Sans Thai already
contains the correctly placed glyphs (`.small` tone marks, `.narrow` marks). `NotoSansThai-Regular.ttf` and
`NotoSansThai-Bold.ttf` were patched with `tools/fonts/add-thai-pdf-mark-variants.py`, which only adds cmap
entries U+F880–U+F890 (private use) for these glyphs; `thai-mark-positioning.model.ts` substitutes them
before drawing and the ToUnicode map is restored to the real characters. Re-run the script after
replacing the Thai files.

## Known limitations

- The CJK fonts ship in regular weight only; bold text reuses the regular file.
- No italic files: italic styles are mapped to the upright file.
- The CJK fonts do not cover Latin Extended-A, so a Czech or Polish name inside an otherwise
  Japanese, Korean or Chinese text will not render (one font per drawn string, no per-run fallback).
- Arabic is shaped by jsPDF's built-in presentation-form mapping; complex ligatures beyond lam-alef are
  not formed. Page layouts stay left-to-right; only the text order inside a string is right-to-left.
- Thai lower vowels under ฎ ฏ ญ ฐ are not adjusted, and jsPDF cannot line-break Thai (no spaces).
