/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TestAccessibilityService,
  CellInfo,
  GridMetadata,
} from './test-accessibility.service';

describe('TestAccessibilityService', () => {
  let service: TestAccessibilityService;

  beforeEach(() => {
    service = new TestAccessibilityService();
    // Clean up window object before each test
    delete (window as any).klacksScheduleGrid;
  });

  afterEach(() => {
    // Clean up after tests
    delete (window as any).klacksScheduleGrid;
  });

  describe('setEnabled', () => {
    it('should expose Window API when enabled', () => {
      service.setEnabled(true);

      expect((window as any).klacksScheduleGrid).toBeDefined();
      expect(typeof (window as any).klacksScheduleGrid?.getCellAt).toBe(
        'function',
      );
      expect(typeof (window as any).klacksScheduleGrid?.getAllCells).toBe(
        'function',
      );
      expect(typeof (window as any).klacksScheduleGrid?.selectCell).toBe(
        'function',
      );
    });

    it('should not expose Window API when disabled', () => {
      service.setEnabled(false);

      expect((window as any).klacksScheduleGrid).toBeUndefined();
    });
  });

  describe('isEnabled', () => {
    it('should return false by default', () => {
      expect(service.isEnabled()).toBe(false);
    });

    it('should return true when enabled', () => {
      service.setEnabled(true);
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false after disabling', () => {
      service.setEnabled(true);
      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('updateGridMetadata', () => {
    beforeEach(() => {
      service.setEnabled(true);
    });

    it('should store cell metadata', () => {
      const cells = new Map<string, CellInfo>([
        [
          '1-2',
          {
            row: 1,
            column: 2,
            value: 'Test Value',
            testId: 'cell-1-2',
            isEditable: true,
            isVisible: true,
            clientId: 'client-123',
            date: '2024-02-15',
          },
        ],
      ]);

      const metadata: GridMetadata = {
        rows: 10,
        columns: 5,
        cells,
      };

      service.updateGridMetadata(metadata);

      const cell = service.getCellInfo(1, 2);
      expect(cell).toBeDefined();
      expect(cell?.value).toBe('Test Value');
      expect(cell?.isEditable).toBe(true);
      expect(cell?.clientId).toBe('client-123');
    });

    it('should return all cells', () => {
      const cells = new Map<string, CellInfo>([
        [
          '1-1',
          {
            row: 1,
            column: 1,
            value: 'A',
            testId: 'cell-1-1',
            isEditable: true,
            isVisible: true,
          },
        ],
        [
          '1-2',
          {
            row: 1,
            column: 2,
            value: 'B',
            testId: 'cell-1-2',
            isEditable: false,
            isVisible: true,
          },
        ],
        [
          '2-1',
          {
            row: 2,
            column: 1,
            value: 'C',
            testId: 'cell-2-1',
            isEditable: true,
            isVisible: false,
          },
        ],
      ]);

      service.updateGridMetadata({ rows: 3, columns: 3, cells });

      const allCells = service.getAllCells();
      expect(allCells).toHaveLength(3);
    });

    it('should return only visible cells', () => {
      const cells = new Map<string, CellInfo>([
        [
          '1-1',
          {
            row: 1,
            column: 1,
            value: 'A',
            testId: 'cell-1-1',
            isEditable: true,
            isVisible: true,
          },
        ],
        [
          '2-2',
          {
            row: 2,
            column: 2,
            value: 'B',
            testId: 'cell-2-2',
            isEditable: false,
            isVisible: false,
          },
        ],
      ]);

      service.updateGridMetadata({ rows: 3, columns: 3, cells });

      const visibleCells = service.getVisibleCells();
      expect(visibleCells).toHaveLength(1);
      expect(visibleCells[0].value).toBe('A');
    });

    it('should return only editable cells', () => {
      const cells = new Map<string, CellInfo>([
        [
          '1-1',
          {
            row: 1,
            column: 1,
            value: 'A',
            testId: 'cell-1-1',
            isEditable: true,
            isVisible: true,
          },
        ],
        [
          '1-2',
          {
            row: 1,
            column: 2,
            value: 'B',
            testId: 'cell-1-2',
            isEditable: false,
            isVisible: true,
          },
        ],
      ]);

      service.updateGridMetadata({ rows: 2, columns: 3, cells });

      const editableCells = service.getEditableCells();
      expect(editableCells).toHaveLength(1);
      expect(editableCells[0].isEditable).toBe(true);
    });
  });

  describe('findCellByValue', () => {
    beforeEach(() => {
      service.setEnabled(true);
      const cells = new Map<string, CellInfo>([
        [
          '1-1',
          {
            row: 1,
            column: 1,
            value: 'Work Entry',
            testId: 'cell-1-1',
            isEditable: false,
            isVisible: true,
          },
        ],
        [
          '2-2',
          {
            row: 2,
            column: 2,
            value: 'Break',
            testId: 'cell-2-2',
            isEditable: true,
            isVisible: true,
          },
        ],
      ]);
      service.updateGridMetadata({ rows: 3, columns: 3, cells });
    });

    it('should find cell by exact value', () => {
      const cell = service.findCellByValue('Work Entry');
      expect(cell).toBeDefined();
      expect(cell?.row).toBe(1);
      expect(cell?.column).toBe(1);
    });

    it('should return undefined for non-existent value', () => {
      const cell = service.findCellByValue('Non Existent');
      expect(cell).toBeUndefined();
    });
  });

  describe('findCellByClientAndDate', () => {
    beforeEach(() => {
      service.setEnabled(true);
      const cells = new Map<string, CellInfo>([
        [
          '1-1',
          {
            row: 1,
            column: 1,
            value: '8h',
            testId: 'cell-1-1',
            isEditable: false,
            isVisible: true,
            clientId: 'client-123',
            date: '2024-02-15',
          },
        ],
        [
          '2-2',
          {
            row: 2,
            column: 2,
            value: '4h',
            testId: 'cell-2-2',
            isEditable: false,
            isVisible: true,
            clientId: 'client-456',
            date: '2024-02-16',
          },
        ],
      ]);
      service.updateGridMetadata({ rows: 3, columns: 3, cells });
    });

    it('should find cell by client ID and date', () => {
      const cell = service.findCellByClientAndDate('client-123', '2024-02-15');
      expect(cell).toBeDefined();
      expect(cell?.value).toBe('8h');
    });

    it('should return undefined for non-matching client/date', () => {
      const cell = service.findCellByClientAndDate('client-999', '2024-02-15');
      expect(cell).toBeUndefined();
    });
  });

  describe('findCellsByClient', () => {
    beforeEach(() => {
      service.setEnabled(true);
    });

    it('should return all cells for a client', () => {
      const cells = new Map<string, CellInfo>([
        [
          '1-1',
          {
            row: 1,
            column: 1,
            value: 'A',
            testId: 'cell-1-1',
            isEditable: false,
            isVisible: true,
            clientId: 'client-123',
          },
        ],
        [
          '1-2',
          {
            row: 1,
            column: 2,
            value: 'B',
            testId: 'cell-1-2',
            isEditable: false,
            isVisible: true,
            clientId: 'client-123',
          },
        ],
        [
          '2-1',
          {
            row: 2,
            column: 1,
            value: 'C',
            testId: 'cell-2-1',
            isEditable: false,
            isVisible: true,
            clientId: 'client-456',
          },
        ],
      ]);
      service.updateGridMetadata({ rows: 3, columns: 3, cells });

      const clientCells = (window as any).klacksScheduleGrid?.findCellsByClient(
        'client-123',
      );
      expect(clientCells).toHaveLength(2);
    });
  });

  describe('findCellByTestId', () => {
    beforeEach(() => {
      service.setEnabled(true);
      const cells = new Map<string, CellInfo>([
        [
          '5-10',
          {
            row: 5,
            column: 10,
            value: 'X',
            testId: 'cell-5-10',
            isEditable: false,
            isVisible: true,
          },
        ],
      ]);
      service.updateGridMetadata({ rows: 10, columns: 15, cells });
    });

    it('should find cell by testId', () => {
      const cell = service.findCellByTestId('cell-5-10');
      expect(cell).toBeDefined();
      expect(cell?.row).toBe(5);
      expect(cell?.column).toBe(10);
    });

    it('should find cell by generated testId pattern', () => {
      // When searching with row-col pattern
      const cell = service.findCellByTestId('cell-5-10');
      expect(cell).toBeDefined();
    });
  });

  describe('cell selection tracking', () => {
    beforeEach(() => {
      service.setEnabled(true);
    });

    it('should track selected cell', () => {
      service.setSelectedCell(3, 4);

      const selected = (window as any).klacksScheduleGrid?.getSelectedCell();
      expect(selected).toEqual({ row: 3, column: 4 });
    });

    it('should return null when no cell selected', () => {
      service.setSelectedCell(0, null);

      const selected = (window as any).klacksScheduleGrid?.getSelectedCell();
      expect(selected).toBeNull();
    });

    it('should track editing cell', () => {
      service.setEditingCell(2, 5);

      const editing = (window as any).klacksScheduleGrid?.getEditingCell();
      expect(editing).toEqual({ row: 2, column: 5 });
      expect((window as any).klacksScheduleGrid?.isEditing()).toBe(true);
    });

    it('should return null when not editing', () => {
      service.setEditingCell(0, null);

      const editing = (window as any).klacksScheduleGrid?.getEditingCell();
      expect(editing).toBeNull();
      expect((window as any).klacksScheduleGrid?.isEditing()).toBe(false);
    });
  });

  describe('ghostCells', () => {
    beforeEach(() => {
      service.setEnabled(true);
    });

    it('should return only non-editable visible cells for ghost DOM', () => {
      const cells = new Map<string, CellInfo>([
        [
          '0-0',
          {
            row: 0,
            column: 0,
            value: 'Header',
            testId: 'cell-0-0',
            isEditable: false,
            isVisible: true,
            isHeader: true,
          },
        ],
        [
          '1-1',
          {
            row: 1,
            column: 1,
            value: 'Work',
            testId: 'cell-1-1',
            isEditable: false,
            isVisible: true,
          },
        ],
        [
          '1-2',
          {
            row: 1,
            column: 2,
            value: '',
            testId: 'cell-1-2',
            isEditable: true,
            isVisible: true,
          },
        ],
        [
          '2-2',
          {
            row: 2,
            column: 2,
            value: 'Hidden',
            testId: 'cell-2-2',
            isEditable: false,
            isVisible: false,
          },
        ],
      ]);
      service.updateGridMetadata({ rows: 3, columns: 3, cells });

      const ghostCells = service.ghostCells();

      // Should include: Header (non-editable), Work (non-editable)
      // Should NOT include: Empty cell (editable), Hidden cell (not visible)
      expect(ghostCells).toHaveLength(2);
      expect(ghostCells.some((c) => c.value === 'Header')).toBe(true);
      expect(ghostCells.some((c) => c.value === 'Work')).toBe(true);
      expect(ghostCells.some((c) => c.value === '')).toBe(false);
    });

    it('should return empty array when disabled', () => {
      service.setEnabled(false);

      const ghostCells = service.ghostCells();
      expect(ghostCells).toHaveLength(0);
    });
  });

  describe('updateCell', () => {
    beforeEach(() => {
      service.setEnabled(true);
      const cells = new Map<string, CellInfo>([
        [
          '1-1',
          {
            row: 1,
            column: 1,
            value: 'Old',
            testId: 'cell-1-1',
            isEditable: true,
            isVisible: true,
          },
        ],
      ]);
      service.updateGridMetadata({ rows: 2, columns: 2, cells });
    });

    it('should update specific cell properties', () => {
      service.updateCell(1, 1, { value: 'New', isEditable: false });

      const cell = service.getCellInfo(1, 1);
      expect(cell?.value).toBe('New');
      expect(cell?.isEditable).toBe(false);
      // Other properties should remain
      expect(cell?.testId).toBe('cell-1-1');
    });

    it('should not update non-existent cell', () => {
      // This should not throw
      service.updateCell(99, 99, { value: 'New' });

      const cell = service.getCellInfo(99, 99);
      expect(cell).toBeUndefined();
    });
  });
});
