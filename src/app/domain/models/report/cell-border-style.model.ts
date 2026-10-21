// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BorderSideStyle } from './border-side-style.interface';
import { BorderLineStyle } from './border-line-style.enum';

export interface CellBorderStyle {
  top: BorderSideStyle;
  right: BorderSideStyle;
  bottom: BorderSideStyle;
  left: BorderSideStyle;
}

export const DEFAULT_BORDER_SIDE: BorderSideStyle = {
  lineStyle: BorderLineStyle.None,
  color: '#000000',
};

export const BORDER_LINE_WIDTHS: Record<BorderLineStyle, number> = {
  [BorderLineStyle.None]: 0,
  [BorderLineStyle.Thin]: 0.1,
  [BorderLineStyle.Medium]: 0.3,
  [BorderLineStyle.Thick]: 0.7,
  [BorderLineStyle.Dashed]: 0.2,
  [BorderLineStyle.Double]: 0.3,
};
