// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unicode font definitions and script detection for PDF reports.
 * The built-in jsPDF fonts (helvetica, times, courier) only cover the WinAnsi character set,
 * so any text outside that range needs an embedded Noto font.
 * @param script - Writing system a font covers
 * @param family - Font family name registered in the jsPDF document
 * @param regularFile - TTF file name of the regular weight inside the font asset folder
 * @param boldFile - Optional TTF file name of the bold weight
 */

export const REPORT_FONT_ASSET_PATH = 'assets/fonts/';

export enum ReportScript {
  WinAnsi = 'winAnsi',
  Extended = 'extended',
  Hebrew = 'hebrew',
  Arabic = 'arabic',
  Thai = 'thai',
  Japanese = 'japanese',
  Korean = 'korean',
  ChineseSimplified = 'chineseSimplified',
  ChineseTraditional = 'chineseTraditional',
}

export interface UnicodeFontDefinition {
  script: ReportScript;
  family: string;
  regularFile: string;
  boldFile?: string;
}

export const UNICODE_FONTS: readonly UnicodeFontDefinition[] = [
  {
    script: ReportScript.Extended,
    family: 'NotoSans',
    regularFile: 'NotoSans-Regular.ttf',
    boldFile: 'NotoSans-Bold.ttf',
  },
  {
    script: ReportScript.Hebrew,
    family: 'NotoSansHebrew',
    regularFile: 'NotoSansHebrew-Regular.ttf',
    boldFile: 'NotoSansHebrew-Bold.ttf',
  },
  {
    script: ReportScript.Arabic,
    family: 'NotoSansArabic',
    regularFile: 'NotoSansArabic-Regular.ttf',
    boldFile: 'NotoSansArabic-Bold.ttf',
  },
  {
    script: ReportScript.Thai,
    family: 'NotoSansThai',
    regularFile: 'NotoSansThai-Regular.ttf',
    boldFile: 'NotoSansThai-Bold.ttf',
  },
  {
    script: ReportScript.Japanese,
    family: 'NotoSansJP',
    regularFile: 'NotoSansJP-Regular.ttf',
  },
  {
    script: ReportScript.Korean,
    family: 'NotoSansKR',
    regularFile: 'NotoSansKR-Regular.ttf',
  },
  {
    script: ReportScript.ChineseSimplified,
    family: 'NotoSansSC',
    regularFile: 'NotoSansSC-Regular.ttf',
  },
  {
    script: ReportScript.ChineseTraditional,
    family: 'NotoSansTC',
    regularFile: 'NotoSansTC-Regular.ttf',
  },
] as const;

export const STANDARD_PDF_FONTS: readonly string[] = ['helvetica', 'times', 'courier'] as const;

const LATIN_1_MAX_CODE_POINT = 0xff;

const WIN_ANSI_EXTRA_CODE_POINTS: ReadonlySet<number> = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

interface ScriptRange {
  script: ReportScript;
  from: number;
  to: number;
}

const HAN_SCRIPT_RANGES: readonly ScriptRange[] = [
  { script: ReportScript.ChineseSimplified, from: 0x2e80, to: 0x2fdf },
  { script: ReportScript.ChineseSimplified, from: 0x3400, to: 0x4dbf },
  { script: ReportScript.ChineseSimplified, from: 0x4e00, to: 0x9fff },
  { script: ReportScript.ChineseSimplified, from: 0xf900, to: 0xfaff },
];

const SCRIPT_RANGES: readonly ScriptRange[] = [
  { script: ReportScript.Hebrew, from: 0x0590, to: 0x05ff },
  { script: ReportScript.Hebrew, from: 0xfb1d, to: 0xfb4f },
  { script: ReportScript.Arabic, from: 0x0600, to: 0x06ff },
  { script: ReportScript.Arabic, from: 0x0750, to: 0x077f },
  { script: ReportScript.Arabic, from: 0x08a0, to: 0x08ff },
  { script: ReportScript.Arabic, from: 0xfb50, to: 0xfdff },
  { script: ReportScript.Arabic, from: 0xfe70, to: 0xfeff },
  { script: ReportScript.Thai, from: 0x0e00, to: 0x0e7f },
  { script: ReportScript.Japanese, from: 0x3040, to: 0x30ff },
  { script: ReportScript.Japanese, from: 0x31f0, to: 0x31ff },
  { script: ReportScript.Korean, from: 0x1100, to: 0x11ff },
  { script: ReportScript.Korean, from: 0x3130, to: 0x318f },
  { script: ReportScript.Korean, from: 0xa960, to: 0xa97f },
  { script: ReportScript.Korean, from: 0xac00, to: 0xd7ff },
  ...HAN_SCRIPT_RANGES,
];

const HAN_LANGUAGE_FONTS: Readonly<Record<string, ReportScript>> = {
  ja: ReportScript.Japanese,
  ko: ReportScript.Korean,
  'zh-tw': ReportScript.ChineseTraditional,
  zh_tw: ReportScript.ChineseTraditional,
  'zh-hant': ReportScript.ChineseTraditional,
};

const SCRIPT_PRIORITY: readonly ReportScript[] = [
  ReportScript.Korean,
  ReportScript.Japanese,
  ReportScript.ChineseTraditional,
  ReportScript.ChineseSimplified,
  ReportScript.Hebrew,
  ReportScript.Arabic,
  ReportScript.Thai,
  ReportScript.Extended,
  ReportScript.WinAnsi,
];

function isWinAnsiCodePoint(code: number): boolean {
  return code <= LATIN_1_MAX_CODE_POINT || WIN_ANSI_EXTRA_CODE_POINTS.has(code);
}

function findScriptForCodePoint(code: number): ReportScript {
  if (isWinAnsiCodePoint(code)) {
    return ReportScript.WinAnsi;
  }
  for (const range of SCRIPT_RANGES) {
    if (code >= range.from && code <= range.to) {
      return range.script;
    }
  }
  return ReportScript.Extended;
}

function isHanCodePoint(code: number): boolean {
  return HAN_SCRIPT_RANGES.some(range => code >= range.from && code <= range.to);
}

/**
 * Determines every writing system used in a text.
 * Han characters resolve to the font matching the UI language, because the
 * Japanese, Korean and Chinese fonts each cover a different subset of Han.
 */
export function detectScripts(text: string, uiLanguage: string): Set<ReportScript> {
  const scripts = new Set<ReportScript>();
  if (!text) {
    return scripts;
  }

  const hanScript = resolveHanScript(uiLanguage);
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === undefined) {
      continue;
    }
    const script = isHanCodePoint(code) ? hanScript : findScriptForCodePoint(code);
    if (script !== ReportScript.WinAnsi) {
      scripts.add(script);
    }
  }
  return scripts;
}

/**
 * Picks the single font that has to render a text.
 * When several scripts are mixed, the most specific one wins, because the
 * script fonts also cover basic Latin while the reverse is not true.
 */
export function resolveScriptForText(text: string, uiLanguage: string): ReportScript {
  const scripts = detectScripts(text, uiLanguage);
  if (scripts.size === 0) {
    return ReportScript.WinAnsi;
  }
  return SCRIPT_PRIORITY.find(script => scripts.has(script)) ?? ReportScript.Extended;
}

export function resolveHanScript(uiLanguage: string): ReportScript {
  const normalized = (uiLanguage || '').toLowerCase();
  return HAN_LANGUAGE_FONTS[normalized] ?? ReportScript.ChineseSimplified;
}

export function getFontDefinition(script: ReportScript): UnicodeFontDefinition | undefined {
  return UNICODE_FONTS.find(font => font.script === script);
}
