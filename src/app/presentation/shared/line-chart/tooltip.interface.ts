// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ITooltip {
  visible: boolean;
  svgX: number;
  svgY: number;
  dayIndex: number;
  values: { label: string; color: string; value: number }[];
}
