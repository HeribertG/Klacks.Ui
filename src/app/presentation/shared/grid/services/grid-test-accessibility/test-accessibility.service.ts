import { Injectable, signal, computed } from '@angular/core';
import type {
  ITestGridMetadata,
  ITestCellInfo,
  ICellPosition,
  IScheduleGridWindowApi,
} from './grid-test-accessibility.types';

export type { ITestGridMetadata, ITestCellInfo, ICellPosition, IScheduleGridWindowApi };

/**
 * Enhanced Test Accessibility Service that works WITH the existing HTML input overlay.
 *
 * Architecture:
 * - Non-editable cells: Ghost DOM divs for clicking/assertions
 * - Editable cells: Use existing .cell-input-overlay (just add test attributes)
 * - All cells: Expose metadata via window.klacksScheduleGrid
 *
 * This service is NOT providedIn: 'root' to avoid loading test code in production.
 * It should be provided by the Schedule component/module when needed.
 */
@Injectable()
export class TestAccessibilityService {
  private _enabled = signal(false);
  private _gridMetadata = signal<ITestGridMetadata>({
    rows: 0,
    columns: 0,
    cells: new Map(),
  });

  // Currently selected cell info
  private _selectedCell = signal<ICellPosition | null>(null);
  private _editingCell = signal<ICellPosition | null>(null);

  isEnabled = computed(() => this._enabled());

  // Computed list of non-editable cells that need ghost DOM
  ghostCells = computed(() => {
    if (!this._enabled()) return [];

    const metadata = this._gridMetadata();
    const ghostCells: ITestCellInfo[] = [];

    metadata.cells.forEach((cell) => {
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

  updateGridMetadata(metadata: ITestGridMetadata) {
    this._gridMetadata.set(metadata);
  }

  updateCell(row: number, column: number, info: Partial<ITestCellInfo>) {
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

  getCellInfo(row: number, column: number): ITestCellInfo | undefined {
    return this._gridMetadata().cells.get(`${row}-${column}`);
  }

  findCellByTestId(testId: string): ITestCellInfo | undefined {
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

  findCellByValue(value: string): ITestCellInfo | undefined {
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
  ): ITestCellInfo | undefined {
    for (const cell of this._gridMetadata().cells.values()) {
      if (cell.clientId === clientId && cell.date === date) {
        return cell;
      }
    }
    return undefined;
  }

  getAllCells(): ITestCellInfo[] {
    return Array.from(this._gridMetadata().cells.values());
  }

  getVisibleCells(): ITestCellInfo[] {
    return this.getAllCells().filter((c) => c.isVisible);
  }

  getEditableCells(): ITestCellInfo[] {
    return this.getAllCells().filter((c) => c.isEditable);
  }

  private exposeTestApi() {
    if (typeof window === 'undefined') return;

    const api: IScheduleGridWindowApi = {
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
        console.log('[klacksGrid] Select cell:', row, column);
        return { row, column };
      },
      startEdit: (row: number, column: number) => {
        console.log('[klacksGrid] Start edit:', row, column);
        return { row, column };
      },
      scrollToRow: (row: number) => {
        console.log('[klacksGrid] Scroll to row:', row);
      },

      // Scroll position (to be overridden by component)
      getScrollPosition: () => ({ horizontal: 0, vertical: 0 }),

      // Configuration
      setEnabled: (enabled: boolean) => this.setEnabled(enabled),
      isEnabled: () => this.isEnabled(),
    };

    window.klacksGrid = api;
  }
}

// Re-export types for backward compatibility
export type GridMetadata = ITestGridMetadata;
export type CellInfo = ITestCellInfo;
export type CellPosition = ICellPosition;

// Legacy type alias - kept for backward compatibility
export type GhostCellInfo = ITestCellInfo;
