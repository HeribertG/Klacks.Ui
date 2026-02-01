import { describe, it, expect, beforeEach } from 'vitest';
import { FillHandleService } from './fill-handle.service';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';

describe('FillHandleService', () => {
  let service: FillHandleService;

  beforeEach(() => {
    service = new FillHandleService();
  });

  describe('initial state', () => {
    it('should start with isDragging false', () => {
      // Assert
      expect(service.isDragging()).toBe(false);
    });

    it('should have empty state initially', () => {
      // Assert
      expect(service.state.startPosition).toBeNull();
      expect(service.state.sourceEntryId).toBeNull();
      expect(service.state.currentColumn).toBe(-1);
    });
  });

  describe('startDrag', () => {
    it('should set dragging state correctly', () => {
      // Arrange
      const position = new MyPosition(5, 10);

      // Act
      service.startDrag(position, 'entry-123', 480, 0);

      // Assert
      expect(service.isDragging()).toBe(true);
      expect(service.state.startPosition).toBe(position);
      expect(service.state.sourceEntryId).toBe('entry-123');
      expect(service.state.sourceWorkTime).toBe(480);
      expect(service.state.sourceEntryType).toBe(0);
      expect(service.state.currentColumn).toBe(10);
    });

    it('should update state signal', () => {
      // Arrange
      const position = new MyPosition(5, 10);

      // Act
      service.startDrag(position, 'entry-123', 480);

      // Assert
      expect(service.stateSignal().isDragging).toBe(true);
    });
  });

  describe('updateDragColumn', () => {
    it('should update current column when dragging right', () => {
      // Arrange
      const position = new MyPosition(5, 10);
      service.startDrag(position, 'entry-123', 480);

      // Act
      service.updateDragColumn(15);

      // Assert
      expect(service.state.currentColumn).toBe(15);
    });

    it('should not update column to less than start column', () => {
      // Arrange
      const position = new MyPosition(5, 10);
      service.startDrag(position, 'entry-123', 480);

      // Act
      service.updateDragColumn(5);

      // Assert
      expect(service.state.currentColumn).toBe(10);
    });

    it('should do nothing when not dragging', () => {
      // Act
      service.updateDragColumn(15);

      // Assert
      expect(service.state.currentColumn).toBe(-1);
    });
  });

  describe('endDrag', () => {
    it('should return result with correct data', () => {
      // Arrange
      const position = new MyPosition(5, 10);
      service.startDrag(position, 'entry-123', 480, 1);
      service.updateDragColumn(15);

      // Act
      const result = service.endDrag();

      // Assert
      expect(result).not.toBeNull();
      expect(result!.startColumn).toBe(10);
      expect(result!.endColumn).toBe(15);
      expect(result!.row).toBe(5);
      expect(result!.entryId).toBe('entry-123');
      expect(result!.workTime).toBe(480);
      expect(result!.entryType).toBe(1);
    });

    it('should reset state after endDrag', () => {
      // Arrange
      const position = new MyPosition(5, 10);
      service.startDrag(position, 'entry-123', 480);
      service.updateDragColumn(15);

      // Act
      service.endDrag();

      // Assert
      expect(service.isDragging()).toBe(false);
      expect(service.state.startPosition).toBeNull();
      expect(service.state.sourceEntryId).toBeNull();
    });

    it('should return null when not dragging', () => {
      // Act
      const result = service.endDrag();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      // Arrange
      const position = new MyPosition(5, 10);
      service.startDrag(position, 'entry-123', 480);

      // Act
      service.reset();

      // Assert
      expect(service.isDragging()).toBe(false);
      expect(service.state.startPosition).toBeNull();
      expect(service.state.sourceEntryId).toBeNull();
      expect(service.state.currentColumn).toBe(-1);
    });
  });

  describe('isOverFillHandle', () => {
    it('should return true when mouse is within hit area', () => {
      // Arrange
      const cellX = 100;
      const cellY = 50;
      const cellWidth = 80;
      const cellHeight = 30;
      const mouseX = 180;
      const mouseY = 80;

      // Act
      const result = service.isOverFillHandle(mouseX, mouseY, cellX, cellY, cellWidth, cellHeight);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when mouse is outside hit area', () => {
      // Arrange
      const cellX = 100;
      const cellY = 50;
      const cellWidth = 80;
      const cellHeight = 30;
      const mouseX = 100;
      const mouseY = 50;

      // Act
      const result = service.isOverFillHandle(mouseX, mouseY, cellX, cellY, cellWidth, cellHeight);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when mouse is exactly at handle center', () => {
      // Arrange
      const cellX = 100;
      const cellY = 50;
      const cellWidth = 80;
      const cellHeight = 30;
      const mouseX = 180;
      const mouseY = 80;

      // Act
      const result = service.isOverFillHandle(mouseX, mouseY, cellX, cellY, cellWidth, cellHeight);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getSelectedColumns', () => {
    it('should return columns from start+1 to current', () => {
      // Arrange
      const position = new MyPosition(5, 10);
      service.startDrag(position, 'entry-123', 480);
      service.updateDragColumn(14);

      // Act
      const columns = service.getSelectedColumns();

      // Assert
      expect(columns).toEqual([11, 12, 13, 14]);
    });

    it('should return empty array when not dragging', () => {
      // Act
      const columns = service.getSelectedColumns();

      // Assert
      expect(columns).toEqual([]);
    });

    it('should return empty array when current equals start', () => {
      // Arrange
      const position = new MyPosition(5, 10);
      service.startDrag(position, 'entry-123', 480);

      // Act
      const columns = service.getSelectedColumns();

      // Assert
      expect(columns).toEqual([]);
    });
  });
});
