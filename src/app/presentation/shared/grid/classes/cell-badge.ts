// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IconCornerEnum } from '../enums/cell-settings.enum';

export const DEFAULT_BADGE_HEIGHT = 12;
export const DEFAULT_BADGE_PADDING = 4;

export class CellBadge {
  text: string;
  backgroundColor: string;
  textColor: string;
  corner: IconCornerEnum;

  constructor(
    text: string,
    backgroundColor: string,
    textColor: string,
    corner: IconCornerEnum
  ) {
    this.text = text;
    this.backgroundColor = backgroundColor;
    this.textColor = textColor;
    this.corner = corner;
  }
}
