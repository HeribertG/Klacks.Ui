import {
  Injectable,
  signal,
  effect,
  inject,
  runInInjectionContext,
  Injector,
} from '@angular/core';
import { TestAccessibilityService } from './test-accessibility.service';
import type {
  ITestableGridDataSource,
  IScrollController,
  ICellManipulationController,
  IDrawScheduleController,
  IGridSettings,
  ITestCellInfo,
  ITestGridMetadata,
} from './grid-test-accessibility.types';
import type { MyPosition } from '../../classes/position';

// Extended interfaces for test framework detection
interface WindowWithTestFrameworks extends Window {
  Cypress?: unknown;
  __PLAYWRIGHT__?: unknown;
}

// Extended interface for scroll service with setter
interface IScrollControllerWithVertical extends IScrollController {
  verticalScrollPosition: number;
}

/**
 * Service that manages test accessibility for the Schedule Grid.
 *
 * This service encapsulates all test-mode functionality including:
 * - Window API exposure (window.klacksGrid)
 * - Ghost DOM metadata synchronization
 * - Scroll position tracking
 * - Cell selection and editing tracking
 *
 * Usage:
 *   private testAccessibility = inject(GridTestAccessibilityService);
 *
 *   // In component initialization:
 *   this.testAccessibility.initialize(dataService, scroll, cellManipulation, drawSchedule, settings);
 *
 * This service is NOT providedIn: 'root' to avoid loading test code in production.
 * It should be provided by the Schedule component/module when needed.
 */
@Injectable()
export class GridTestAccessibilityService {
  private testAccessibility = inject(TestAccessibilityService);
  private injector = inject(Injector);

  // References to grid components (set during initialization)
  private dataService!: ITestableGridDataSource;
  private scrollService!: IScrollController;
  private cellManipulationService!: ICellManipulationController;
  private drawScheduleService!: IDrawScheduleController;
  private settings!: IGridSettings;

  // Feature flag
  enabled = signal(false);

  /**
   * Initializes the test accessibility service.
   * Must be called before using any other methods.
   */
  initialize(
    dataService: ITestableGridDataSource,
    scroll: IScrollController,
    cellManipulation: ICellManipulationController,
    drawSchedule: IDrawScheduleController,
    settings: IGridSettings,
  ): void {
    this.dataService = dataService;
    this.scrollService = scroll;
    this.cellManipulationService = cellManipulation;
    this.drawScheduleService = drawSchedule;
    this.settings = settings;

    // Check if test mode should be enabled
    const urlParams = new URLSearchParams(window.location.search);
    const testMode =
      urlParams.has('testMode') ||
      typeof (window as WindowWithTestFrameworks).Cypress !== 'undefined' ||
      typeof (window as WindowWithTestFrameworks).__PLAYWRIGHT__ !==
        'undefined';

    if (testMode) {
      this.enabled.set(true);
      this.setupTestMode();
    }
  }

  private setupTestMode(): void {
    this.testAccessibility.setEnabled(true);
    this.setupApiHooks();
    this.syncMetadata();

    // Initial metadata update
    requestAnimationFrame(() => this.updateMetadata());

    console.log('[Grid] Test accessibility enabled');
  }

  private setupApiHooks(): void {
    const api = window.klacksGrid;
    if (!api) return;

    // Cell selection
    api.selectCell = (row: number, column: number) => {
      this.cellManipulationService.Position = {
        row,
        column,
        isEmpty: () => false,
        isSamePosition: (p: { row: number; column: number }) =>
          p.row === row && p.column === column,
      } as unknown as MyPosition;
      this.testAccessibility.setSelectedCell(row, column);
      return { row, column };
    };

    // Start editing
    api.startEdit = (row: number, column: number) => {
      if (this.dataService.isCellEditable(row, column)) {
        this.cellManipulationService.Position = {
          row,
          column,
          isEmpty: () => false,
          isSamePosition: (p: { row: number; column: number }) =>
            p.row === row && p.column === column,
        } as unknown as MyPosition;
        this.cellManipulationService.setIsEditing(true);
        this.testAccessibility.setEditingCell(row, column);
      }
      return { row, column };
    };

    // Scroll to row
    api.scrollToRow = (row: number) => {
      (
        this.scrollService as IScrollControllerWithVertical
      ).verticalScrollPosition = row;
      this.drawScheduleService.moveGrid();
      // Update metadata after scroll with RAF for better sync
      requestAnimationFrame(() => this.updateMetadata());
    };

    // Get scroll position
    api.getScrollPosition = () => ({
      horizontal: this.scrollService.horizontalScrollPosition,
      vertical: this.scrollService.verticalScrollPosition,
    });
  }

  private syncMetadata(): void {
    runInInjectionContext(this.injector, () => {
      // Sync on scroll changes
      effect(() => {
        // Trigger on scroll changes
        this.scrollService.horizontalScrollPosition;
        this.scrollService.verticalScrollPosition;

        this.updateMetadata();
      });

      // Track selected cell
      effect(() => {
        const pos = this.cellManipulationService.positionSignal();
        if (pos && !pos.isEmpty()) {
          this.testAccessibility.setSelectedCell(pos.row, pos.column);
        } else {
          this.testAccessibility.setSelectedCell(0, null);
        }
      });

      // Track editing state
      effect(() => {
        const isEditing = this.cellManipulationService.isEditing();
        const pos = this.cellManipulationService.positionSignal();
        if (isEditing && pos && !pos.isEmpty()) {
          this.testAccessibility.setEditingCell(pos.row, pos.column);
        } else {
          this.testAccessibility.setEditingCell(0, null);
        }
      });
    });
  }

  /**
   * Updates the test metadata based on current grid state.
   * Called automatically on scroll changes.
   */
  updateMetadata(): void {
    if (!this.enabled()) return;

    const cells = new Map<string, ITestCellInfo>();
    const visibleRows = this.calculateVisibleRows();
    const visibleCols = this.calculateVisibleColumns();
    const startRow = this.scrollService.verticalScrollPosition;
    const startCol = this.scrollService.horizontalScrollPosition;

    // Helper to extract schedule-specific data
    const getClientInfo = (
      row: number,
    ): { clientId?: string; clientName?: string } => {
      const ds = this.dataService;
      if (ds.rowGroupIndex && Array.isArray(ds.rowGroupIndex)) {
        const clientIndex = ds.rowGroupIndex[row];
        if (clientIndex !== undefined && ds.getGroupIndex) {
          const client = ds.getGroupIndex(clientIndex);
          if (client) {
            return { clientId: client.id, clientName: client.name };
          }
        }
      }
      return {};
    };

    const getDateForColumn = (col: number): string | undefined => {
      const ds = this.dataService;
      if (ds.getDateForColumn) {
        const date = ds.getDateForColumn(col);
        if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        }
      }
      if (ds.startDate instanceof Date) {
        const date = new Date(ds.startDate);
        date.setDate(date.getDate() + col);
        return date.toISOString().split('T')[0];
      }
      return undefined;
    };

    for (let r = 0; r < visibleRows; r++) {
      for (let c = 0; c < visibleCols; c++) {
        const row = startRow + r;
        const col = startCol + c;

        if (row >= this.dataService.rows || col >= this.dataService.columns)
          continue;

        const value = this.dataService.getItemMainText(row, col) || '';
        const isEditable = this.dataService.isCellEditable(row, col);
        const isHeader = row === 0 || col === 0;

        const x = (col - startCol) * this.settings.cellWidth;
        const y =
          (row - startRow) * this.settings.cellHeight +
          this.settings.cellHeaderHeight;

        const { clientId, clientName } = getClientInfo(row);
        const date = getDateForColumn(col);

        cells.set(`${row}-${col}`, {
          row,
          column: col,
          value,
          testId: `cell-${row}-${col}`,
          isEditable,
          isVisible: true,
          isHeader,
          x,
          y,
          width: this.settings.cellWidth,
          height: this.settings.cellHeight,
          clientId,
          clientName,
          date,
        });
      }
    }

    const metadata: ITestGridMetadata = {
      rows: this.dataService.rows,
      columns: this.dataService.columns,
      cells,
    };

    this.testAccessibility.updateGridMetadata(metadata);
  }

  /**
   * Calculates visible rows based on viewport height and cell height.
   * Uses window.innerHeight as fallback if canvas dimensions not available.
   */
  private calculateVisibleRows(): number {
    if (!this.drawScheduleService.isCanvasAvailable()) return 1;

    // Try to get actual canvas height, fallback to window height
    const viewportHeight =
      this.drawScheduleService.height || window.innerHeight;
    return Math.ceil(viewportHeight / this.settings.cellHeight);
  }

  /**
   * Calculates visible columns based on viewport width and cell width.
   * Uses window.innerWidth as fallback if canvas dimensions not available.
   */
  private calculateVisibleColumns(): number {
    if (!this.drawScheduleService.isCanvasAvailable()) return 1;

    // Try to get actual canvas width, fallback to window width
    const viewportWidth = this.drawScheduleService.width || window.innerWidth;
    return Math.ceil(viewportWidth / this.settings.cellWidth);
  }
}
