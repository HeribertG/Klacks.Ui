/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { RowSelectionService } from './row-selection.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DataManagementBreakService } from 'src/app/domain/services/absence/data-management-break.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { ScrollService } from '../../../../shared/scrollbar/scroll.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { CalendarCalculationService } from './calendar-calculation.service';
import { BreakRenderingService } from './break-rendering.service';
import { signal } from '@angular/core';
import { Break } from 'src/app/domain/models/break-class';

describe('RowSelectionService', () => {
  let service: RowSelectionService;
  let mockGanttCanvasManager: jasmine.SpyObj<GanttCanvasManagerService>;
  let mockGridColors: jasmine.SpyObj<GridColorService>;
  let mockDataManagementBreak: jasmine.SpyObj<DataManagementBreakService>;
  let mockDataManagementAbsence: jasmine.SpyObj<DataManagementAbsenceGanttService>;
  let mockScroll: jasmine.SpyObj<ScrollService>;
  let mockCalendarSetting: jasmine.SpyObj<CalendarSettingService>;
  let mockCalculationService: jasmine.SpyObj<CalendarCalculationService>;
  let mockBreakRenderingService: jasmine.SpyObj<BreakRenderingService>;
  let mockCtx: jasmine.SpyObj<CanvasRenderingContext2D>;
  let mockRows: number;
  let mockFirstVisibleRow: number;
  let mockVisibleRow: number;
  let mockFirstVisibleColumn: number;
  let mockLastVisibleColumn: number;
  let mockVerticalScrollPosition: number;
  let mockHorizontalScrollPosition: number;

  beforeEach(() => {
    mockCtx = jasmine.createSpyObj('CanvasRenderingContext2D', [
      'save',
      'restore',
      'beginPath',
      'rect',
      'clip',
      'fillRect',
    ]);

    const mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;

    mockGanttCanvasManager = jasmine.createSpyObj(
      'GanttCanvasManagerService',
      ['isCanvasAvailable'],
      {
        ctx: mockCtx,
        canvas: mockCanvas,
        width: 800,
        height: 600,
      }
    );
    mockGanttCanvasManager.isCanvasAvailable.and.returnValue(true);

    mockGridColors = jasmine.createSpyObj('GridColorService', [], {
      focusBorderColor: '#0000ff',
    });

    mockRows = 100;
    mockFirstVisibleRow = 0;
    mockVisibleRow = 20;
    mockFirstVisibleColumn = 0;
    mockLastVisibleColumn = 365;
    mockVerticalScrollPosition = 0;
    mockHorizontalScrollPosition = 0;

    mockDataManagementBreak = jasmine.createSpyObj(
      'DataManagementBreakService',
      ['readData'],
      {}
    );

    Object.defineProperty(mockDataManagementBreak, 'rows', {
      get: () => mockRows,
      set: (value: number) => { mockRows = value; },
      configurable: true
    });

    mockDataManagementAbsence = jasmine.createSpyObj(
      'DataManagementAbsenceGanttService',
      [],
      {
        absenceList: signal([
          { id: '1', color: '#ff0000', name: 'Vacation' },
          { id: '2', color: '#00ff00', name: 'Sick Leave' },
        ]),
      }
    );

    mockScroll = jasmine.createSpyObj('ScrollService', ['dummy']);
    Object.defineProperty(mockScroll, 'verticalScrollPosition', {
      get: () => mockVerticalScrollPosition,
      set: (value: number) => { mockVerticalScrollPosition = value; },
      configurable: true
    });
    Object.defineProperty(mockScroll, 'horizontalScrollPosition', {
      get: () => mockHorizontalScrollPosition,
      set: (value: number) => { mockHorizontalScrollPosition = value; },
      configurable: true
    });

    mockCalendarSetting = jasmine.createSpyObj('CalendarSettingService', [], {
      cellWidth: 10,
      cellHeight: 30,
      cellHeaderHeight: 50,
    });

    mockCalculationService = jasmine.createSpyObj('CalendarCalculationService', [
      'calcDateRectangle',
      'firstVisibleColumn',
      'lastVisibleColumn',
      'visibleRow',
    ]);

    Object.defineProperty(mockCalculationService, 'firstVisibleRow', {
      get: () => mockFirstVisibleRow,
      configurable: true
    });

    mockCalculationService.firstVisibleColumn.and.returnValue(mockFirstVisibleColumn);
    mockCalculationService.lastVisibleColumn.and.returnValue(mockLastVisibleColumn);
    mockCalculationService.visibleRow.and.returnValue(mockVisibleRow);

    mockBreakRenderingService = jasmine.createSpyObj('BreakRenderingService', [
      'drawBreakIntern',
      'drawBreakSelectBorderIntern',
      'drawBreakSelectBorderInternAnchor',
    ]);

    TestBed.configureTestingModule({
      providers: [
        RowSelectionService,
        {
          provide: GanttCanvasManagerService,
          useValue: mockGanttCanvasManager,
        },
        { provide: GridColorService, useValue: mockGridColors },
        {
          provide: DataManagementBreakService,
          useValue: mockDataManagementBreak,
        },
        {
          provide: DataManagementAbsenceGanttService,
          useValue: mockDataManagementAbsence,
        },
        { provide: ScrollService, useValue: mockScroll },
        { provide: CalendarSettingService, useValue: mockCalendarSetting },
        {
          provide: CalendarCalculationService,
          useValue: mockCalculationService,
        },
        {
          provide: BreakRenderingService,
          useValue: mockBreakRenderingService,
        },
      ],
    });

    service = TestBed.inject(RowSelectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('selectedRow', () => {
    it('should set selected row within valid range', () => {
      service.selectedRow = 5;

      expect(service.selectedRow).toBe(5);
    });

    it('should reset selectedBreakIndex when changing row', () => {
      service.selectedRow = 5;
      service.selectedBreakIndex = 2;

      service.selectedRow = 10;

      expect(service.selectedBreakIndex).toBe(-1);
    });

    it('should not change if setting same value', () => {
      service.selectedRow = 5;
      const spy = spyOnProperty(service, 'selectedBreakIndex', 'set');

      service.selectedRow = 5;

      expect(spy).not.toHaveBeenCalled();
    });

    it('should clamp negative values to 0', () => {
      service.selectedRow = -5;

      expect(service.selectedRow).toBe(0);
    });

    it('should clamp values exceeding max rows', () => {
      mockRows = 50;

      service.selectedRow = 100;

      expect(service.selectedRow).toBe(50);
    });
  });

  describe('selectedBreakIndex', () => {
    it('should set selected break index', () => {
      service.selectedBreakIndex = 3;

      expect(service.selectedBreakIndex).toBe(3);
    });

    it('should not change if setting same value', () => {
      service.selectedBreakIndex = 3;
      const initialValue = service.selectedBreakIndex;

      service.selectedBreakIndex = 3;

      expect(service.selectedBreakIndex).toBe(initialValue);
    });
  });

  describe('selectedBreak', () => {
    it('should return selected break from data', () => {
      const mockBreak = {
        id: 'break-1',
        from: new Date(2024, 0, 1),
        until: new Date(2024, 0, 5),
      } as unknown as Break;

      service.selectedRow = 5;
      service.selectedBreakIndex = 2;
      mockDataManagementBreak.readData.and.returnValue([
        null as any,
        null as any,
        mockBreak,
      ]);

      const result = service.selectedBreak;

      expect(result).toBe(mockBreak);
      expect(mockDataManagementBreak.readData).toHaveBeenCalledWith(5);
    });

    it('should return undefined for invalid row', () => {
      service.selectedRow = -1;

      const result = service.selectedBreak;

      expect(result).toBeUndefined();
    });

    it('should return undefined for row exceeding max', () => {
      mockRows = 50;
      service.selectedRow = 100;

      const result = service.selectedBreak;

      expect(result).toBeUndefined();
    });
  });

  describe('drawSelectionRow', () => {
    it('should draw selection overlay for valid row', () => {
      // Arrange
      service.selectedRow = 5;
      mockScroll.verticalScrollPosition = 2;
      mockFirstVisibleColumn = 0;
      mockLastVisibleColumn = 80;
      mockCalculationService.firstVisibleColumn.and.returnValue(mockFirstVisibleColumn);
      mockCalculationService.lastVisibleColumn.and.returnValue(mockLastVisibleColumn);

      // Act
      service.drawSelectionRow();

      // Assert
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.rect).toHaveBeenCalled();
      expect(mockCtx.clip).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should not draw for invalid row', () => {
      service.selectedRow = -1;

      service.drawSelectionRow();

      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('should use correct position based on scroll', () => {
      // Arrange
      service.selectedRow = 10;
      mockVerticalScrollPosition = 5;
      mockFirstVisibleColumn = 0;
      mockLastVisibleColumn = 80;
      mockCalculationService.firstVisibleColumn.and.returnValue(mockFirstVisibleColumn);
      mockCalculationService.lastVisibleColumn.and.returnValue(mockLastVisibleColumn);

      // Act
      service.drawSelectionRow();

      // Assert
      const dy = 10 - 5;
      const expectedTop =
        Math.floor(dy * mockCalendarSetting.cellHeight) +
        mockCalendarSetting.cellHeaderHeight;

      expect(mockCtx.fillRect).toHaveBeenCalledWith(
        0,
        expectedTop,
        jasmine.any(Number),
        mockCalendarSetting.cellHeight
      );
    });

    it('should use calculated width when available', () => {
      // Arrange
      service.selectedRow = 5;
      mockFirstVisibleColumn = 10;
      mockLastVisibleColumn = 50;
      mockCalculationService.firstVisibleColumn.and.returnValue(mockFirstVisibleColumn);
      mockCalculationService.lastVisibleColumn.and.returnValue(mockLastVisibleColumn);

      // Act
      service.drawSelectionRow();

      // Assert
      const expectedWidth =
        (50 - 10) * mockCalendarSetting.cellWidth;

      expect(mockCtx.fillRect).toHaveBeenCalledWith(
        0,
        jasmine.any(Number),
        expectedWidth,
        mockCalendarSetting.cellHeight
      );
    });

    it('should fallback to canvas width if calculated width is 0', () => {
      // Arrange
      service.selectedRow = 5;
      mockFirstVisibleColumn = 10;
      mockLastVisibleColumn = 10;
      mockCalculationService.firstVisibleColumn.and.returnValue(mockFirstVisibleColumn);
      mockCalculationService.lastVisibleColumn.and.returnValue(mockLastVisibleColumn);

      // Act
      service.drawSelectionRow();

      // Assert
      expect(mockCtx.fillRect).toHaveBeenCalledWith(
        0,
        jasmine.any(Number),
        mockGanttCanvasManager.width,
        mockCalendarSetting.cellHeight
      );
    });
  });

  describe('isSelectedRowVisible', () => {
    it('should return true when row is visible', () => {
      // Arrange
      service.selectedRow = 15;
      mockFirstVisibleRow = 10;
      mockVisibleRow = 20;
      mockRows = 100;
      mockCalculationService.visibleRow.and.returnValue(mockVisibleRow);

      // Act & Assert
      expect(service.isSelectedRowVisible()).toBe(true);
    });

    it('should return false when row is before visible area', () => {
      // Arrange
      service.selectedRow = 5;
      mockFirstVisibleRow = 10;
      mockVisibleRow = 20;
      mockCalculationService.visibleRow.and.returnValue(mockVisibleRow);

      // Act & Assert
      expect(service.isSelectedRowVisible()).toBe(false);
    });

    it('should return false when row is after visible area', () => {
      // Arrange
      service.selectedRow = 50;
      mockFirstVisibleRow = 10;
      mockVisibleRow = 20;
      mockCalculationService.visibleRow.and.returnValue(mockVisibleRow);

      // Act & Assert
      expect(service.isSelectedRowVisible()).toBe(false);
    });

    it('should return false when row exceeds total rows', () => {
      // Arrange
      service.selectedRow = 150;
      mockFirstVisibleRow = 10;
      mockVisibleRow = 20;
      mockRows = 100;
      mockCalculationService.visibleRow.and.returnValue(mockVisibleRow);

      // Act & Assert
      expect(service.isSelectedRowVisible()).toBe(false);
    });
  });

  describe('checkSelectedRowVisibility', () => {
    it('should reset selectedRow if exceeds total rows', () => {
      // Arrange
      service.selectedRow = 150;
      mockRows = 100;

      // Act
      service.checkSelectedRowVisibility();

      // Assert
      expect(service.selectedRow).toBe(100);
    });

    it('should not change selectedRow if within valid range', () => {
      // Arrange
      service.selectedRow = 50;
      mockRows = 100;

      // Act
      service.checkSelectedRowVisibility();

      // Assert
      expect(service.selectedRow).toBe(50);
    });
  });

  describe('isSelectedBreak_Dirty', () => {
    it('should return false when no break is selected', () => {
      // Arrange
      service.selectedRow = -1;

      // Act & Assert
      expect(service.isSelectedBreak_Dirty()).toBe(false);
    });

    it('should return true when break is selected', () => {
      // Arrange
      const mockBreak = {
        id: 'break-1',
        from: new Date(2024, 0, 1),
        until: new Date(2024, 0, 5),
      } as unknown as Break;

      service.selectedRow = 5;
      service.selectedBreakIndex = 0;
      mockDataManagementBreak.readData.and.returnValue([mockBreak]);

      // Act & Assert
      expect(service.isSelectedBreak_Dirty()).toBe(true);
    });
  });
});
