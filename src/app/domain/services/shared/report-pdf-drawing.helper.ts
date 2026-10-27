// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Drawing helpers the report PDF renderers share: text colour, underlines, table cell borders and the document
 * direction they mirror against.
 * @param doc - jsPDF document that is drawn on
 * @param field - Report field whose style (colour, border) is applied
 * @param cell - autoTable cell whose frame receives the borders
 */

import { jsPDF } from 'jspdf';
import { Cell } from 'jspdf-autotable';

import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { BORDER_LINE_WIDTHS } from 'src/app/domain/models/report/cell-border-style.model';
import { BorderLineStyle } from 'src/app/domain/models/report/border-line-style.enum';
import { hexToRgb } from 'src/app/domain/helpers/report-pdf-style.helper';

const RTL_DIRECTION = 'rtl';
const BLACK = '#000000';
const UNDERLINE_OFFSET_MM = 0.5;
const UNDERLINE_WIDTH_MM = 0.2;
const FALLBACK_BORDER_WIDTH_MM = 0.1;
const DASH_PATTERN: readonly number[] = [1, 1];
const DOUBLE_LINE_WIDTH_MM = 0.1;
const DOUBLE_LINE_OFFSET_MM = 0.4;

export function isDocumentRtl(): boolean {
  return document.documentElement.dir === RTL_DIRECTION;
}

export function applyTextColor(doc: jsPDF, hex: string | undefined): void {
  const rgb = hexToRgb(hex || BLACK);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
}

export function drawUnderline(doc: jsPDF, text: string, x: number, y: number, field: ReportField): void {
  const textWidth = doc.getTextWidth(text);
  const lineY = y + UNDERLINE_OFFSET_MM;
  const rgb = hexToRgb(field.style.textColor ?? BLACK);
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(UNDERLINE_WIDTH_MM);
  doc.line(x, lineY, x + textWidth, lineY);
}

export function drawCellBorders(doc: jsPDF, field: ReportField, cell: Cell): void {
  const border = field.style.cellBorder!;
  const x = cell.x;
  const y = cell.y;
  const w = cell.width;
  const h = cell.height;

  const isRtl = isDocumentRtl();
  const logicalLeft = isRtl ? 'right' : 'left';
  const logicalRight = isRtl ? 'left' : 'right';

  const sides: { key: 'top' | 'right' | 'bottom' | 'left'; x1: number; y1: number; x2: number; y2: number }[] = [
    { key: 'top', x1: x, y1: y, x2: x + w, y2: y },
    { key: logicalRight, x1: x + w, y1: y, x2: x + w, y2: y + h },
    { key: 'bottom', x1: x, y1: y + h, x2: x + w, y2: y + h },
    { key: logicalLeft, x1: x, y1: y, x2: x, y2: y + h },
  ];

  for (const side of sides) {
    const sideStyle = border[side.key];
    if (!sideStyle || sideStyle.lineStyle === BorderLineStyle.None) continue;

    const rgb = hexToRgb(sideStyle.color);
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    const lineWidth = BORDER_LINE_WIDTHS[sideStyle.lineStyle] ?? FALLBACK_BORDER_WIDTH_MM;

    if (sideStyle.lineStyle === BorderLineStyle.Dashed) {
      doc.setLineWidth(lineWidth);
      doc.setLineDashPattern([...DASH_PATTERN], 0);
      doc.line(side.x1, side.y1, side.x2, side.y2);
      doc.setLineDashPattern([], 0);
    } else if (sideStyle.lineStyle === BorderLineStyle.Double) {
      doc.setLineWidth(DOUBLE_LINE_WIDTH_MM);
      const offset = DOUBLE_LINE_OFFSET_MM;
      if (side.key === 'top' || side.key === 'bottom') {
        doc.line(side.x1, side.y1 - offset, side.x2, side.y2 - offset);
        doc.line(side.x1, side.y1 + offset, side.x2, side.y2 + offset);
      } else {
        doc.line(side.x1 - offset, side.y1, side.x2 - offset, side.y2);
        doc.line(side.x1 + offset, side.y1, side.x2 + offset, side.y2);
      }
    } else {
      doc.setLineWidth(lineWidth);
      doc.line(side.x1, side.y1, side.x2, side.y2);
    }
  }
}
