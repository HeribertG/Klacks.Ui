// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for managing cell border styles on report fields.
 * @param field - The ReportField whose border is being managed
 * @param side - The border side (top, right, bottom, left) to manipulate
 */

import { Injectable } from '@angular/core';

import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { BorderLineStyle, CellBorderStyle, DEFAULT_BORDER_SIDE } from 'src/app/domain/models/report/cell-border-style.model';

type BorderSide = 'top' | 'right' | 'bottom' | 'left';
const ALL_SIDES: BorderSide[] = ['top', 'right', 'bottom', 'left'];

@Injectable()
export class ReportDesignerBorderService {

  ensureCellBorder(field: ReportField): CellBorderStyle {
    if (!field.style.cellBorder) {
      field.style.cellBorder = {
        top: { ...DEFAULT_BORDER_SIDE },
        right: { ...DEFAULT_BORDER_SIDE },
        bottom: { ...DEFAULT_BORDER_SIDE },
        left: { ...DEFAULT_BORDER_SIDE },
      };
    }
    return field.style.cellBorder;
  }

  getBorderSideActive(field: ReportField, side: BorderSide): boolean {
    return (field.style.cellBorder?.[side]?.lineStyle ?? BorderLineStyle.None) !== BorderLineStyle.None;
  }

  toggleBorderSide(field: ReportField, side: BorderSide): void {
    const border = this.ensureCellBorder(field);
    if (border[side].lineStyle === BorderLineStyle.None) {
      border[side].lineStyle = BorderLineStyle.Thin;
    } else {
      border[side].lineStyle = BorderLineStyle.None;
    }
  }

  setBorderLineStyle(field: ReportField, style: BorderLineStyle): void {
    const border = this.ensureCellBorder(field);
    for (const side of ALL_SIDES) {
      if (border[side].lineStyle !== BorderLineStyle.None) {
        border[side].lineStyle = style;
      }
    }
  }

  setBorderColor(field: ReportField, color: string): void {
    const border = this.ensureCellBorder(field);
    for (const side of ALL_SIDES) {
      border[side].color = color;
    }
  }

  setAllBorders(field: ReportField, lineStyle: BorderLineStyle): void {
    const border = this.ensureCellBorder(field);
    for (const side of ALL_SIDES) {
      border[side].lineStyle = lineStyle;
    }
  }

  getActiveBorderLineStyle(field: ReportField): BorderLineStyle {
    const border = field.style.cellBorder;
    if (!border) return BorderLineStyle.None;
    for (const side of ALL_SIDES) {
      if (border[side].lineStyle !== BorderLineStyle.None) {
        return border[side].lineStyle;
      }
    }
    return BorderLineStyle.None;
  }

  getActiveBorderColor(field: ReportField): string {
    const border = field.style.cellBorder;
    if (!border) return '#000000';
    for (const side of ALL_SIDES) {
      if (border[side].lineStyle !== BorderLineStyle.None) {
        return border[side].color;
      }
    }
    return '#000000';
  }
}
