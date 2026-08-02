# Report fonts

Embedded TrueType fonts for PDF report generation (`ReportFontService`).

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
application bundle. jsPDF subsets them, so a generated PDF only carries the glyphs it uses.

## Origin

Google Noto fonts, licensed under the SIL Open Font License 1.1 (see `OFL.txt`).
Source: <https://github.com/google/fonts> and <https://github.com/notofonts>.

The upstream files are variable fonts. They were instantiated to static weights with
`fontTools.varLib.instancer` (`wght=400` for regular, `wght=700` for bold, `wdth=100` where the
axis exists), which removes the variation tables jsPDF cannot interpret and roughly halves the
CJK file sizes.

## Known limitations

- The CJK fonts ship in regular weight only; bold text reuses the regular file.
- No italic files: italic styles are mapped to the upright file.
- The CJK fonts do not cover Latin Extended-A, so a Czech or Polish name inside an otherwise
  Japanese, Korean or Chinese text will not render.
