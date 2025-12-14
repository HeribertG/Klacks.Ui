import { IconCornerEnum } from '../enums/cell-settings.enum';

export const DEFAULT_ICON_SIZE = 10;

export class CellIcon {
  svgIcon: string;
  corner: IconCornerEnum;
  size: number;

  constructor(
    svgIcon: string,
    corner: IconCornerEnum,
    size: number = DEFAULT_ICON_SIZE
  ) {
    this.svgIcon = svgIcon;
    this.corner = corner;
    this.size = size;
  }
}
