// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IGridTooltipHost {
  showToolTip(payload: { value: string; event: MouseEvent }): void;
  hideToolTip(): void;
  destroyToolTip(): void;
}
