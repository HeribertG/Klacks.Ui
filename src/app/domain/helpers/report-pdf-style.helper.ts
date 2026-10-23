// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure style conversions for the report PDF: hex colours, jsPDF font styles, mirrored alignments and table widths.
 * @param hex - Colour as #rrggbb; anything else becomes black
 * @param alignment - Report text alignment (0 left, 1 center, 2 right)
 * @param isRtl - True when the document is laid out right to left, which mirrors left and right
 */

import type { FontStyle, HAlignType } from 'jspdf-autotable';

const MIN_WIDTH_PERCENT = 10;
const MAX_WIDTH_PERCENT = 100;
const HEX_COLOR_PATTERN = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const HEX_RADIX = 16;
const BLACK = '#000000';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = HEX_COLOR_PATTERN.exec(hex);
  return result ? {
    r: parseInt(result[1], HEX_RADIX),
    g: parseInt(result[2], HEX_RADIX),
    b: parseInt(result[3], HEX_RADIX)
  } : { r: 0, g: 0, b: 0 };
}

export function hexToRgbArray(hex: string | undefined): [number, number, number] {
  const rgb = hexToRgb(hex || BLACK);
  return [rgb.r, rgb.g, rgb.b];
}

export function toJsPdfFontStyle(bold: boolean, italic: boolean): FontStyle {
  if (bold && italic) return 'bolditalic';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'normal';
}

export function resolveReportHalign(alignment: number, isRtl: boolean): HAlignType {
  const ltr = alignment === 0 ? 'left' : alignment === 1 ? 'center' : 'right';
  if (isRtl && ltr !== 'center') {
    return ltr === 'left' ? 'right' : 'left';
  }
  return ltr;
}

export function clampWidthPercent(value: number | undefined): number {
  if (value === undefined || value === null) return MAX_WIDTH_PERCENT;
  if (value < MIN_WIDTH_PERCENT) return MIN_WIDTH_PERCENT;
  if (value > MAX_WIDTH_PERCENT) return MAX_WIDTH_PERCENT;
  return value;
}
