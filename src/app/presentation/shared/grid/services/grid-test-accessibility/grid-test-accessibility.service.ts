/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  signal,
  effect,
  inject,
  runInInjectionContext,
  Injector,
} from '@angular/core';
import {
  TestAccessibilityService,
  CellInfo,
} from './test-accessibility.service';
import { BaseSettingsService } from '../data-setting/settings.service';

import { BaseDataService } from '../data-setting/data.service';
import { MyPosition } from '../../classes/position';

/**
/**
 * Service that manages test accessibility for the Schedule Grid.
 *
 * This service encapsulates all test-mode functionality including:
 * - Window API exposure (window.klacksScheduleGrid)
 * - Ghost DOM metadata synchronization
 * - Scroll position tracking
 * - Cell selection and editing tracking
 * 
 * Usage:
 *   private testAccessibility = inject(GridTestAccessibilityService);
 *   
 *   // In component initialization:
 *   this.testAccessibility.initialize(this.dataService, this.scroll, this.cellManipulation, this.drawSchedule);
 *
 * This service is NOT providedIn: 'root' to avoid loading test code in production.
 * It should be provided by the Schedule component/module when needed.
 */
@Injectable()
export class GridTestAccessibilityService {
  private testAccessibility = inject(TestAccessibilityService);
  private settings = inject(BaseSettingsService);
  private injector = inject(Injector);

  // References to grid components (set during initialization)
  private dataService!: BaseDataService;
  private scrollService!: {
    horizontalScrollPosition: number;
    verticalScrollPosition: number;
  };
  private cellManipulationService!: {
    positionSignal: () => MyPosition | null;
    isEditing: () => boolean;
    Position: MyPosition;
    setIsEditing: (value: boolean) => void;
  };
  private drawScheduleService!: {
    moveGrid: () => void;
    isCanvasAvailable: () => boolean;
  };

  // Feature flag
  enabled = signal(false);

  /**
   * Initializes the test accessibility service.
   * Must be called before using any other methods.
   */
  initialize(
    dataService: BaseDataService,
    scroll: {
      horizontalScrollPosition: number;
      verticalScrollPosition: number;
    },
    cellManipulation: {
      positionSignal: () => MyPosition | null;
      isEditing: () => boolean;
      Position: MyPosition;
      setIsEditing: (value: boolean) => void;
    },
    drawSchedule: { moveGrid: () => void; isCanvasAvailable: () => boolean },
  ): void {
    this.dataService = dataService;
    this.scrollService = scroll;
    this.cellManipulationService = cellManipulation;
    this.drawScheduleService = drawSchedule;

    // Check if test mode should be enabled
    const urlParams = new URLSearchParams(window.location.search);
    const testMode =
      urlParams.has('testMode') ||
      typeof (window as any).Cypress !== 'undefined' ||
      typeof (window as any).__PLAYWRIGHT__ !== 'undefined';

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
    setTimeout(() => this.updateMetadata(), 0);

    console.log('[Grid] Test accessibility enabled');
  }

  private setupApiHooks(): void {
    const api = (window as any).klacksScheduleGrid;
    if (!api) return;

    // Cell selection
    api.selectCell = (row: number, column: number) => {
      this.cellManipulationService.Position = new MyPosition(row, column);
      this.testAccessibility.setSelectedCell(row, column);
      return { row, column };
    };

    // Start editing
    api.startEdit = (row: number, column: number) => {
      if (this.dataService.isCellEditable(row, column)) {
        this.cellManipulationService.Position = new MyPosition(row, column);
        this.cellManipulationService.setIsEditing(true);
        this.testAccessibility.setEditingCell(row, column);
      }
      return { row, column };
    };

    // Scroll to row
    api.scrollToRow = (row: number) => {
      (this.scrollService as any).verticalScrollPosition = row;
      this.drawScheduleService.moveGrid();
      // Update metadata after scroll
      setTimeout(() => this.updateMetadata(), 100);
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

    const cells = new Map<string, CellInfo>();
    const visibleRows = this.calculateVisibleRows();
    const visibleCols = this.calculateVisibleColumns();
    const startRow = this.scrollService.verticalScrollPosition;
    const startCol = this.scrollService.horizontalScrollPosition;

    // Helper to extract schedule-specific data
    const getClientInfo = (
      row: number,
    ): { clientId?: string; clientName?: string } => {
      const ds = this.dataService as any;
      if (ds.rowGroupIndex && Array.isArray(ds.rowGroupIndex)) {
        const clientIndex = ds.rowGroupIndex[row];
        if (
          clientIndex !== undefined &&
          typeof ds.getGroupIndex === 'function'
        ) {
          const client = ds.getGroupIndex(clientIndex);
          if (client) {
            return { clientId: client.id, clientName: client.name };
          }
        }
      }
      return {};
    };

    const getDateForColumn = (col: number): string | undefined => {
      const ds = this.dataService as any;
      if (typeof ds.getDateForColumn === 'function') {
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

    this.testAccessibility.updateGridMetadata({
      rows: this.dataService.rows,
      columns: this.dataService.columns,
      cells,
    });
  }

  private calculateVisibleRows(): number {
    if (!this.drawScheduleService.isCanvasAvailable()) return 1;
    // Approximate - could be passed from component
    return 20;
  }

  private calculateVisibleColumns(): number {
    if (!this.drawScheduleService.isCanvasAvailable()) return 1;
    // Approximate - could be passed from component
    return 15;
  }
}
