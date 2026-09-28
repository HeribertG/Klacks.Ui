// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IGridTooltipHost {
  showToolTip(payload: { value: string; event: MouseEvent }): void;
  hideToolTip(): void;
  destroyToolTip(): void;
}
