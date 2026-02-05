/**
 * Type definitions for Grid Test Accessibility
 * 
 * These interfaces define the contract between the GridTestAccessibilityService
 * and the grid components, ensuring type safety and proper encapsulation.
 */

import { MyPosition } from '../../classes/position';

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

/**
 * Interface for scroll controller.
 * Provides access to scroll position and scroll operations.
 */
export interface IScrollController {
  /** Current horizontal scroll position */
  horizontalScrollPosition: number;
  
  /** Current vertical scroll position */
  verticalScrollPosition: number;
}

/**
 * Interface for cell manipulation controller.
 * Handles cell selection and editing state.
 */
export interface ICellManipulationController {
  /** Gets the current position signal */
  positionSignal(): MyPosition | null;
  
  /** Checks if currently in edit mode */
  isEditing(): boolean;
  
  /** Sets the current position */
  Position: MyPosition;
  
  /** Sets the editing state */
  setIsEditing(value: boolean): void;
}

/**
 * Interface for draw schedule controller.
 * Handles canvas rendering and viewport queries.
 */
export interface IDrawScheduleController {
  /** 
   * Triggers a grid redraw after scroll changes.
   */
  moveGrid(): void;
  
  /**
   * Checks if canvas is available and initialized.
   */
  isCanvasAvailable(): boolean;
  
  /**
   * Gets the canvas width in pixels.
   */
  readonly width?: number;
  
  /**
   * Gets the canvas height in pixels.
   */
  readonly height?: number;
}

/**
 * Interface for grid settings.
 */
export interface IGridSettings {
  /** Cell width in pixels */
  cellWidth: number;
  
  /** Cell height in pixels */
  cellHeight: number;
  
  /** Header row height in pixels */
  cellHeaderHeight: number;
}

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

/**
 * Grid metadata exposed to tests.
 */
export interface ITestGridMetadata {
  rows: number;
  columns: number;
  cells: Map<string, ITestCellInfo>;
}

/**
 * Cell position for selection tracking.
 */
export interface ICellPosition {
  row: number;
  column: number;
}

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

declare global {
  interface Window {
    klacksGrid?: IScheduleGridWindowApi;
  }
}
