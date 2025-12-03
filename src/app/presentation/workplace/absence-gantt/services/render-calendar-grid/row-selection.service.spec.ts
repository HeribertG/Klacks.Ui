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
    let mockGanttCanvasManager: any;
    let mockGridColors: any;
    let mockDataManagementBreak: any;
    let mockDataManagementAbsence: any;
    let mockScroll: any;
    let mockCalendarSetting: any;
    let mockCalculationService: any;
    let mockBreakRenderingService: any;
    let mockCtx: any;
    let mockRows: number;
    let mockFirstVisibleRow: number;
    let mockVisibleRow: number;
    let mockFirstVisibleColumn: number;
    let mockLastVisibleColumn: number;
    let mockVerticalScrollPosition: number;
    let mockHorizontalScrollPosition: number;

    beforeEach(() => {
        mockCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            rect: vi.fn(),
            clip: vi.fn(),
            fillRect: vi.fn()
        };

        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 800;
        mockCanvas.height = 600;

        mockGanttCanvasManager = {
            isCanvasAvailable: vi.fn(),
            ctx: mockCtx,
            canvas: mockCanvas,
            width: 800,
            height: 600
        };
        mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);

        mockGridColors = {
            focusBorderColor: '#0000ff'
        };

        mockRows = 100;
        mockFirstVisibleRow = 0;
        mockVisibleRow = 20;
        mockFirstVisibleColumn = 0;
        mockLastVisibleColumn = 365;
        mockVerticalScrollPosition = 0;
        mockHorizontalScrollPosition = 0;

        mockDataManagementBreak = {
            readData: vi.fn()
        };

        Object.defineProperty(mockDataManagementBreak, 'rows', {
            get: () => mockRows,
            set: (value: number) => { mockRows = value; },
            configurable: true
        });

        mockDataManagementAbsence = {
            absenceList: signal([
                { id: '1', color: '#ff0000', name: 'Vacation' },
                { id: '2', color: '#00ff00', name: 'Sick Leave' },
            ])
        };

        mockScroll = {
            dummy: vi.fn()
        };
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

        mockCalendarSetting = {
            cellWidth: 10,
            cellHeight: 30,
            cellHeaderHeight: 50
        };

        mockCalculationService = {
            calcDateRectangle: vi.fn(),
            firstVisibleColumn: vi.fn(),
            lastVisibleColumn: vi.fn(),
            visibleRow: vi.fn()
        };

        Object.defineProperty(mockCalculationService, 'firstVisibleRow', {
            get: () => mockFirstVisibleRow,
            configurable: true
        });

        mockCalculationService.firstVisibleColumn.mockReturnValue(mockFirstVisibleColumn);
        mockCalculationService.lastVisibleColumn.mockReturnValue(mockLastVisibleColumn);
        mockCalculationService.visibleRow.mockReturnValue(mockVisibleRow);

        mockBreakRenderingService = {
            drawBreakIntern: vi.fn(),
            drawBreakSelectBorderIntern: vi.fn(),
            drawBreakSelectBorderInternAnchor: vi.fn()
        };

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
            const spy = vi.spyOn(service, 'selectedBreakIndex', 'set');

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
            mockDataManagementBreak.readData.mockReturnValue([
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
            mockCalculationService.firstVisibleColumn.mockReturnValue(mockFirstVisibleColumn);
            mockCalculationService.lastVisibleColumn.mockReturnValue(mockLastVisibleColumn);

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
            mockCalculationService.firstVisibleColumn.mockReturnValue(mockFirstVisibleColumn);
            mockCalculationService.lastVisibleColumn.mockReturnValue(mockLastVisibleColumn);

            // Act
            service.drawSelectionRow();

            // Assert
            const dy = 10 - 5;
            const expectedTop = Math.floor(dy * mockCalendarSetting.cellHeight) +
                mockCalendarSetting.cellHeaderHeight;

            expect(mockCtx.fillRect).toHaveBeenCalledWith(0, expectedTop, expect.any(Number), mockCalendarSetting.cellHeight);
        });

        it('should use calculated width when available', () => {
            // Arrange
            service.selectedRow = 5;
            mockFirstVisibleColumn = 10;
            mockLastVisibleColumn = 50;
            mockCalculationService.firstVisibleColumn.mockReturnValue(mockFirstVisibleColumn);
            mockCalculationService.lastVisibleColumn.mockReturnValue(mockLastVisibleColumn);

            // Act
            service.drawSelectionRow();

            // Assert
            const expectedWidth = (50 - 10) * mockCalendarSetting.cellWidth;

            expect(mockCtx.fillRect).toHaveBeenCalledWith(0, expect.any(Number), expectedWidth, mockCalendarSetting.cellHeight);
        });

        it('should fallback to canvas width if calculated width is 0', () => {
            // Arrange
            service.selectedRow = 5;
            mockFirstVisibleColumn = 10;
            mockLastVisibleColumn = 10;
            mockCalculationService.firstVisibleColumn.mockReturnValue(mockFirstVisibleColumn);
            mockCalculationService.lastVisibleColumn.mockReturnValue(mockLastVisibleColumn);

            // Act
            service.drawSelectionRow();

            // Assert
            expect(mockCtx.fillRect).toHaveBeenCalledWith(0, expect.any(Number), mockGanttCanvasManager.width, mockCalendarSetting.cellHeight);
        });
    });

    describe('isSelectedRowVisible', () => {
        it('should return true when row is visible', () => {
            // Arrange
            service.selectedRow = 15;
            mockFirstVisibleRow = 10;
            mockVisibleRow = 20;
            mockRows = 100;
            mockCalculationService.visibleRow.mockReturnValue(mockVisibleRow);

            // Act & Assert
            expect(service.isSelectedRowVisible()).toBe(true);
        });

        it('should return false when row is before visible area', () => {
            // Arrange
            service.selectedRow = 5;
            mockFirstVisibleRow = 10;
            mockVisibleRow = 20;
            mockCalculationService.visibleRow.mockReturnValue(mockVisibleRow);

            // Act & Assert
            expect(service.isSelectedRowVisible()).toBe(false);
        });

        it('should return false when row is after visible area', () => {
            // Arrange
            service.selectedRow = 50;
            mockFirstVisibleRow = 10;
            mockVisibleRow = 20;
            mockCalculationService.visibleRow.mockReturnValue(mockVisibleRow);

            // Act & Assert
            expect(service.isSelectedRowVisible()).toBe(false);
        });

        it('should return false when row exceeds total rows', () => {
            // Arrange
            service.selectedRow = 150;
            mockFirstVisibleRow = 10;
            mockVisibleRow = 20;
            mockRows = 100;
            mockCalculationService.visibleRow.mockReturnValue(mockVisibleRow);

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
            mockDataManagementBreak.readData.mockReturnValue([mockBreak]);

            // Act & Assert
            expect(service.isSelectedBreak_Dirty()).toBe(true);
        });
    });
});
