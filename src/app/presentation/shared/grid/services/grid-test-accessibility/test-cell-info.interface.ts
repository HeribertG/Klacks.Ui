// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cell metadata exposed to tests.
 */
export interface ITestCellInfo {
  row: number;
  column: number;
  value: string;
  testId: string;
  isEditable: boolean;
  isVisible: boolean;
  isHeader?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  clientId?: string;
  clientName?: string;
  date?: string;
}
