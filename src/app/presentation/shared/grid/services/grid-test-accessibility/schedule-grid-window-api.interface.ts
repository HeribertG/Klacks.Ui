// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ITestCellInfo } from './test-cell-info.interface';
import { ICellPosition } from './cell-position.interface';

/**
 * Window API exposed for E2E testing.
 */
export interface IScheduleGridWindowApi {
  /** Gets cell at specific coordinates */
  getCellAt(row: number, column: number): ITestCellInfo | undefined;
  
  /** Gets cell by test ID */
  getCellByTestId(testId: string): ITestCellInfo | undefined;
  
  /** Gets cell by displayed value */
  getCellByValue(value: string): ITestCellInfo | undefined;
  
  /** Gets cell by client ID and date */
  getCellByClientAndDate(clientId: string, date: string): ITestCellInfo | undefined;
  
  /** Gets all visible cells */
  getAllCells(): ITestCellInfo[];
  
  /** Gets only visible cells */
  getVisibleCells(): ITestCellInfo[];
  
  /** Gets currently selected cell */
  getSelectedCell(): ICellPosition | null;
  
  /** Gets currently editing cell */
  getEditingCell(): ICellPosition | null;
  
  /** Checks if currently editing */
  isEditing(): boolean;
  
  /** Finds all cells for a client */
  findCellsByClient(clientId: string): ITestCellInfo[];
  
  /** Finds all cells for a date */
  findCellsByDate(date: string): ITestCellInfo[];
  
  /** Selects a cell */
  selectCell(row: number, column: number): ICellPosition;
  
  /** Starts editing a cell */
  startEdit(row: number, column: number): ICellPosition;
  
  /** Scrolls to a specific row */
  scrollToRow(row: number): void;
  
  /** Gets current scroll position */
  getScrollPosition(): { horizontal: number; vertical: number };
  
  /** Enables/disables test mode */
  setEnabled(enabled: boolean): void;
  
  /** Checks if test mode is enabled */
  isEnabled(): boolean;
}
