// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TextAlignment } from './text-alignment.enum';
import { CellBorderStyle } from './cell-border-style.model';

export interface FieldStyle {
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontFamily: string;
  alignment: TextAlignment;
  textColor: string;
  backgroundColor: string;
  cellBorder?: CellBorderStyle;
}
