/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, signal, computed } from '@angular/core';

/**
 * Enhanced Test Accessibility Service that works WITH the existing HTML input overlay.
 *
 * Architecture:
 * - Non-editable cells: Ghost DOM divs for clicking/assertions
 * - Editable cells: Use existing .cell-input-overlay (just add test attributes)
 * - All cells: Expose metadata via window.klacksScheduleGrid
 */
/**
 * This service is NOT providedIn: 'root' to avoid loading test code in production.
 * It should be provided by the Schedule component/module when needed.
 */
@Injectable()
export class TestAccessibilityService {
  private _enabled = signal(false);
  private _gridMetadata = signal<GridMetadata>({
    rows: 0,
    columns: 0,
    cells: new Map(),
  });

  // Currently selected cell info
  private _selectedCell = signal<CellPosition | null>(null);
  private _editingCell = signal<CellPosition | null>(null);

  isEnabled = computed(() => this._enabled());

  // Computed list of non-editable cells that need ghost DOM
  ghostCells = computed(() => {
    if (!this._enabled()) return [];

    const metadata = this._gridMetadata();
    const ghostCells: GhostCellInfo[] = [];

    metadata.cells.forEach((cell, key) => {
      // Only create ghost elements for NON-EDITABLE cells
      // Editable cells use the existing .cell-input-overlay
      if (!cell.isEditable && cell.isVisible) {
        ghostCells.push({
          ...cell,
          testId: `cell-${cell.row}-${cell.column}`,
        });
      }
    });

    return ghostCells;
  });

  setEnabled(enabled: boolean) {
    this._enabled.set(enabled);
    if (enabled) {
      this.exposeTestApi();
    }
  }

  updateGridMetadata(metadata: GridMetadata) {
    this._gridMetadata.set(metadata);
  }

  updateCell(row: number, column: number, info: Partial<CellInfo>) {
    const metadata = this._gridMetadata();
    const key = `${row}-${column}`;
    const existing = metadata.cells.get(key);
    if (existing) {
      metadata.cells.set(key, { ...existing, ...info });
      this._gridMetadata.set({ ...metadata });
    }
  }

  setSelectedCell(row: number, column: number | null) {
    if (column === null) {
      this._selectedCell.set(null);
    } else {
      this._selectedCell.set({ row, column });
    }
  }

  setEditingCell(row: number, column: number | null) {
    if (column === null) {
      this._editingCell.set(null);
    } else {
      this._editingCell.set({ row, column });
    }
  }

  getCellInfo(row: number, column: number): CellInfo | undefined {
    return this._gridMetadata().cells.get(`${row}-${column}`);
  }

  findCellByTestId(testId: string): CellInfo | undefined {
    for (const cell of this._gridMetadata().cells.values()) {
      if (
        cell.testId === testId ||
        `cell-${cell.row}-${cell.column}` === testId
      ) {
        return cell;
      }
    }
    return undefined;
  }

  findCellByValue(value: string): CellInfo | undefined {
    for (const cell of this._gridMetadata().cells.values()) {
      if (cell.value === value) {
        return cell;
      }
    }
    return undefined;
  }

  findCellByClientAndDate(
    clientId: string,
    date: string,
  ): CellInfo | undefined {
    for (const cell of this._gridMetadata().cells.values()) {
      if (cell.clientId === clientId && cell.date === date) {
        return cell;
      }
    }
    return undefined;
  }

  getAllCells(): CellInfo[] {
    return Array.from(this._gridMetadata().cells.values());
  }

  getVisibleCells(): CellInfo[] {
    return this.getAllCells().filter((c) => c.isVisible);
  }

  getEditableCells(): CellInfo[] {
    return this.getAllCells().filter((c) => c.isEditable);
  }

  private exposeTestApi() {
    if (typeof window === 'undefined') return;

    (window as any).klacksScheduleGrid = {
      // Cell queries
      getCellAt: (row: number, column: number) => this.getCellInfo(row, column),
      getCellByTestId: (testId: string) => this.findCellByTestId(testId),
      getCellByValue: (value: string) => this.findCellByValue(value),
      getCellByClientAndDate: (clientId: string, date: string) =>
        this.findCellByClientAndDate(clientId, date),
      getAllCells: () => this.getAllCells(),
      getVisibleCells: () => this.getVisibleCells(),

      // State queries
      getSelectedCell: () => this._selectedCell(),
      getEditingCell: () => this._editingCell(),
      isEditing: () => this._editingCell() !== null,

      // Helpers
      findCellsByClient: (clientId: string) =>
        this.getAllCells().filter((c) => c.clientId === clientId),
      findCellsByDate: (date: string) =>
        this.getAllCells().filter((c) => c.date === date),

      // Actions (these would need to be connected to actual grid actions)
      selectCell: (row: number, column: number) => {
        // This will be overridden by the component to actually select
        console.log('[klacksScheduleGrid] Select cell:', row, column);
        return { row, column };
      },
      startEdit: (row: number, column: number) => {
        console.log('[klacksScheduleGrid] Start edit:', row, column);
        return { row, column };
      },
      scrollToRow: (row: number) => {
        console.log('[klacksScheduleGrid] Scroll to row:', row);
      },

      // Scroll position (to be overridden by component)
      getScrollPosition: () => ({ horizontal: 0, vertical: 0 }),

      // Configuration
      setEnabled: (enabled: boolean) => this.setEnabled(enabled),
      isEnabled: () => this.isEnabled(),
    };

    // Scroll position is provided by grid component via getScrollPosition hook
  }
}

// Interfaces
export interface GridMetadata {
  rows: number;
  columns: number;
  cells: Map<string, CellInfo>; // key: "row-col"
}

export interface CellInfo {
  row: number;
  column: number;
  value: string;
  testId: string;
  isEditable: boolean;
  isVisible: boolean;
  isHeader?: boolean;
  x?: number; // Screen position
  y?: number;
  width?: number;
  height?: number;
  // Schedule-specific metadata
  clientId?: string;
  clientName?: string;
  date?: string;
  entryType?: 'work' | 'break' | 'workChange' | 'expenses' | 'empty';
  shiftId?: string;
  // Styling info
  backgroundColor?: string;
  textColor?: string;
}

export interface GhostCellInfo extends CellInfo {
  // Additional info for ghost DOM rendering
}

export interface CellPosition {
  row: number;
  column: number;
}

// Extend Window interface
declare global {
  interface Window {
    klacksScheduleGrid?: {
      getCellAt: (row: number, column: number) => CellInfo | undefined;
      getCellByTestId: (testId: string) => CellInfo | undefined;
      getCellByValue: (value: string) => CellInfo | undefined;
      getCellByClientAndDate: (
        clientId: string,
        date: string,
      ) => CellInfo | undefined;
      getAllCells: () => CellInfo[];
      getVisibleCells: () => CellInfo[];
      getSelectedCell: () => CellPosition | null;
      getEditingCell: () => CellPosition | null;
      isEditing: () => boolean;
      findCellsByClient: (clientId: string) => CellInfo[];
      findCellsByDate: (date: string) => CellInfo[];
      selectCell: (row: number, column: number) => CellPosition;
      startEdit: (row: number, column: number) => CellPosition;
      scrollToRow: (row: number) => void;
      getScrollPosition: () => { horizontal: number; vertical: number };
      setEnabled: (enabled: boolean) => void;
      isEnabled: () => boolean;
    };
  }
}
