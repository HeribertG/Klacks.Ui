// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Type definitions for Grid Test Accessibility
 * 
 * These interfaces define the contract between the GridTestAccessibilityService
 * and the grid components, ensuring type safety and proper encapsulation.
 */

import { IScheduleGridWindowApi } from './schedule-grid-window-api.interface';

/**
 * Interface for grid data sources that support test accessibility.
 * This decouples the test service from specific implementation details.
 */
export interface ITestableGridDataSource {
  /** Total number of rows in the grid */
  readonly rows: number;
  
  /** Total number of columns in the grid */
  readonly columns: number;
  
  /** 
   * Maps row index to client group index.
   * Used for schedule grids where multiple rows belong to one client.
   */
  readonly rowGroupIndex?: number[];
  
  /**
   * Gets the client/group at the specified index.
   * @param index The client index (from rowGroupIndex)
   * @returns Client object with id and name, or undefined
   */
  getGroupIndex?(index: number): { id: string; name: string } | undefined;
  
  /**
   * Gets the date for a specific column.
   * @param column The column index
   * @returns Date for that column, or undefined
   */
  getDateForColumn?(column: number): Date | undefined;
  
  /**
   * Gets the start date of the grid (for date calculation fallback).
   */
  readonly startDate?: Date;
  
  /**
   * Gets the display text for a cell.
   * @param row Row index
   * @param column Column index
   * @returns The cell's display text
   */
  getItemMainText(row: number, column: number): string;
  
  /**
   * Checks if a cell is editable.
   * @param row Row index
   * @param column Column index
   * @returns true if the cell can be edited
   */
  isCellEditable(row: number, column: number): boolean;
}

declare global {
  interface Window {
    klacksGrid?: IScheduleGridWindowApi;
  }
}
