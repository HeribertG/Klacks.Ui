// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface GanttDrawingConfig {
  pageWidth: number;
  pageHeight: number;
  rowHeaderWidth: number;
  rowHeight: number;
  year: number;
  startDate: Date;
  evenMonthColor: string;
  oddMonthColor: string;
  weekendColor: string;
  dayLineColor: string;
  monthBorderColor: string;
  lineWidth: number;
}
