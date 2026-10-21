// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ITestCellInfo } from './test-cell-info.interface';

/**
 * Grid metadata exposed to tests.
 */
export interface ITestGridMetadata {
  rows: number;
  columns: number;
  cells: Map<string, ITestCellInfo>;
}
