// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { DrawCalendarGanttService } from './draw-calendar-gantt.service';
import { GanttCanvasManagerService } from './gantt-canvas-manager.service';
import { RenderCalendarGridService } from './render-calendar-grid';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { HolidayCollectionService } from '../../../shared/grid/services/holiday-collection.service';
import { CalendarSettingService } from './calendar-setting.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { ScrollService } from '../../../shared/scrollbar/scroll.service';

describe('DrawCalendarGanttService', () => {
    let service: DrawCalendarGanttService;
    let mockGanttCanvasManager: any;
    let mockRenderCalendarGrid: any;
    let mockGridColors: any;
    let mockHolidayCollection: any;
    let mockCalendarSetting: any;
    let mockDataManagementBreak: any;
    let mockScrollService: any;
    let mockRows: number;
    let mockCurrentYear: number;

    beforeEach(() => {
        mockRows = 10;
        mockCurrentYear = 2024;

        mockGanttCanvasManager = {
            canvas: null,
            ctx: null,
            width: 800,
            height: 600,
            headerCanvas: null,
            renderCanvas: null,
            isCanvasAvailable: vi.fn().mockReturnValue(false),
            createCanvas: vi.fn(),
            deleteCanvas: vi.fn()
        };

        mockRenderCalendarGrid = {
            selectedRow: 0,
            selectedBreakIndex: -1,
            selectedBreakRec: undefined,
            selectedBreak: undefined,
            startDate: new Date(2024, 0, 1),
            isSelectedBreak_Dirty: vi.fn().mockReturnValue(false),
            renderRuler: vi.fn(),
            renderCalendar: vi.fn(),
            moveGridVertical: vi.fn(),
            drawSelectionRow: vi.fn(),
            unDrawSelectionRow: vi.fn(),
            drawSelectedBreak: vi.fn(),
            drawRow: vi.fn(),
            drawRowIntern: vi.fn(),
            calcRowRec: vi.fn(),
            calcLeftAnchorRectangle: vi.fn(),
            calcRightAnchorRectangle: vi.fn(),
            updateStartDate: vi.fn(),
            checkSelectedRowVisibility: vi.fn(),
            firstVisibleColumn: vi.fn().mockReturnValue(0),
            lastVisibleColumn: vi.fn().mockReturnValue(365),
            visibleCol: vi.fn().mockReturnValue(100),
            visibleRow: vi.fn().mockReturnValue(20)
        };

        mockGridColors = {
            focusBorderColor: '#000000'
        };

        mockHolidayCollection = {};
        Object.defineProperty(mockHolidayCollection, 'currentYear', {
            get: () => mockCurrentYear,
            set: (v: number) => { mockCurrentYear = v; },
            configurable: true
        });

        mockCalendarSetting = {
            cellWidth: 20,
            cellHeight: 25,
            cellHeaderHeight: 50
        };

        mockDataManagementBreak = {
            readData: vi.fn().mockReturnValue([])
        };
        Object.defineProperty(mockDataManagementBreak, 'rows', {
            get: () => mockRows,
            set: (v: number) => { mockRows = v; },
            configurable: true
        });

        mockScrollService = {
            horizontalScrollPosition: 0,
            verticalScrollPosition: 0,
            verticalScrollDelta: 0,
            maxCols: 365,
            resetDeltas: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                DrawCalendarGanttService,
                { provide: GanttCanvasManagerService, useValue: mockGanttCanvasManager },
                { provide: RenderCalendarGridService, useValue: mockRenderCalendarGrid },
                { provide: GridColorService, useValue: mockGridColors },
                { provide: HolidayCollectionService, useValue: mockHolidayCollection },
                { provide: CalendarSettingService, useValue: mockCalendarSetting },
                { provide: DataManagementBreakPlaceholderService, useValue: mockDataManagementBreak },
                { provide: DataManagementAbsenceGanttService, useValue: {} },
                { provide: ScrollService, useValue: mockScrollService }
            ]
        });

        service = TestBed.inject(DrawCalendarGanttService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Signal behavior', () => {
        it('should have vScrollbarRefreshTrigger signal initialized to 0', () => {
            expect(service.vScrollbarRefreshTrigger).toBeDefined();
            expect(typeof service.vScrollbarRefreshTrigger).toBe('function');
            expect(service.vScrollbarRefreshTrigger()).toBe(0);
        });

        it('should have hScrollbarRefreshTrigger signal initialized to 0', () => {
            expect(service.hScrollbarRefreshTrigger).toBeDefined();
            expect(typeof service.hScrollbarRefreshTrigger).toBe('function');
            expect(service.hScrollbarRefreshTrigger()).toBe(0);
        });
    });

    describe('vScrollbarRefreshTrigger', () => {
        it('should increment when update is called', () => {
            const initialValue = service.vScrollbarRefreshTrigger();

            service.vScrollbarRefreshTrigger.update(v => v + 1);

            expect(service.vScrollbarRefreshTrigger()).toBe(initialValue + 1);
        });

        it('should increment multiple times', () => {
            const initialValue = service.vScrollbarRefreshTrigger();

            service.vScrollbarRefreshTrigger.update(v => v + 1);
            service.vScrollbarRefreshTrigger.update(v => v + 1);
            service.vScrollbarRefreshTrigger.update(v => v + 1);

            expect(service.vScrollbarRefreshTrigger()).toBe(initialValue + 3);
        });
    });

    describe('hScrollbarRefreshTrigger', () => {
        it('should increment when update is called', () => {
            const initialValue = service.hScrollbarRefreshTrigger();

            service.hScrollbarRefreshTrigger.update(v => v + 1);

            expect(service.hScrollbarRefreshTrigger()).toBe(initialValue + 1);
        });

        it('should increment multiple times', () => {
            const initialValue = service.hScrollbarRefreshTrigger();

            service.hScrollbarRefreshTrigger.update(v => v + 1);
            service.hScrollbarRefreshTrigger.update(v => v + 1);
            service.hScrollbarRefreshTrigger.update(v => v + 1);

            expect(service.hScrollbarRefreshTrigger()).toBe(initialValue + 3);
        });
    });

    describe('setMetrics', () => {
        it('should increment vScrollbarRefreshTrigger', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);
            const initialValue = service.vScrollbarRefreshTrigger();

            service.setMetrics();

            expect(service.vScrollbarRefreshTrigger()).toBe(initialValue + 1);
        });

        it('should increment hScrollbarRefreshTrigger', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);
            const initialValue = service.hScrollbarRefreshTrigger();

            service.setMetrics();

            expect(service.hScrollbarRefreshTrigger()).toBe(initialValue + 1);
        });

        it('should increment both triggers simultaneously', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);
            const initialVValue = service.vScrollbarRefreshTrigger();
            const initialHValue = service.hScrollbarRefreshTrigger();

            service.setMetrics();

            expect(service.vScrollbarRefreshTrigger()).toBe(initialVValue + 1);
            expect(service.hScrollbarRefreshTrigger()).toBe(initialHValue + 1);
        });
    });

    describe('delegation to renderCalendarGrid', () => {
        it('visibleCol should delegate', () => {
            mockRenderCalendarGrid.visibleCol.mockReturnValue(42);

            expect(service.visibleCol()).toBe(42);
            expect(mockRenderCalendarGrid.visibleCol).toHaveBeenCalled();
        });

        it('visibleRow should delegate', () => {
            mockRenderCalendarGrid.visibleRow.mockReturnValue(15);

            expect(service.visibleRow()).toBe(15);
            expect(mockRenderCalendarGrid.visibleRow).toHaveBeenCalled();
        });

        it('firstVisibleColumn should delegate', () => {
            mockRenderCalendarGrid.firstVisibleColumn.mockReturnValue(10);

            expect(service.firstVisibleColumn()).toBe(10);
            expect(mockRenderCalendarGrid.firstVisibleColumn).toHaveBeenCalled();
        });

        it('lastVisibleColumn should delegate', () => {
            mockRenderCalendarGrid.lastVisibleColumn.mockReturnValue(300);

            expect(service.lastVisibleColumn()).toBe(300);
            expect(mockRenderCalendarGrid.lastVisibleColumn).toHaveBeenCalled();
        });

        it('createRuler should delegate to renderRuler', () => {
            service.createRuler();

            expect(mockRenderCalendarGrid.renderRuler).toHaveBeenCalled();
        });

        it('renderCalendar should delegate', () => {
            service.renderCalendar();

            expect(mockRenderCalendarGrid.renderCalendar).toHaveBeenCalled();
        });

        it('drawSelectionRow should delegate', () => {
            service.drawSelectionRow();

            expect(mockRenderCalendarGrid.drawSelectionRow).toHaveBeenCalled();
        });

        it('unDrawSelectionRow should delegate', () => {
            service.unDrawSelectionRow();

            expect(mockRenderCalendarGrid.unDrawSelectionRow).toHaveBeenCalled();
        });

        it('drawSelectedBreak should delegate', () => {
            service.drawSelectedBreak();

            expect(mockRenderCalendarGrid.drawSelectedBreak).toHaveBeenCalled();
        });

        it('checkSelectedRowVisibility should delegate', () => {
            service.checkSelectedRowVisibility();

            expect(mockRenderCalendarGrid.checkSelectedRowVisibility).toHaveBeenCalled();
        });

        it('selectedBreak getter should delegate', () => {
            const mockBreak = { id: '1' };
            mockRenderCalendarGrid.selectedBreak = mockBreak;

            expect(service.selectedBreak).toBe(mockBreak);
        });

        it('selectedBreakRec getter should delegate', () => {
            const rec = { left: 0, top: 0, right: 100, bottom: 50 };
            mockRenderCalendarGrid.selectedBreakRec = rec;

            expect(service.selectedBreakRec).toBe(rec);
        });

        it('isSelectedBreak_Dirty should delegate', () => {
            mockRenderCalendarGrid.isSelectedBreak_Dirty.mockReturnValue(true);

            expect(service.isSelectedBreak_Dirty).toBe(true);
        });
    });

    describe('selectedRow', () => {
        it('getter should delegate to renderCalendarGrid', () => {
            mockRenderCalendarGrid.selectedRow = 7;

            expect(service.selectedRow).toBe(7);
        });

        it('setter should delegate to renderCalendarGrid', () => {
            service.selectedRow = 5;

            expect(mockRenderCalendarGrid.selectedRow).toBe(5);
        });
    });

    describe('selectedBreakIndex', () => {
        it('getter should delegate to renderCalendarGrid', () => {
            mockRenderCalendarGrid.selectedBreakIndex = 3;

            expect(service.selectedBreakIndex).toBe(3);
        });

        it('setter should delegate to renderCalendarGrid', () => {
            service.selectedBreakIndex = 2;

            expect(mockRenderCalendarGrid.selectedBreakIndex).toBe(2);
        });
    });

    describe('handleVerticalScroll', () => {
        beforeEach(() => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);
        });

        it('should return early when scrollDelta is 0', () => {
            mockScrollService.verticalScrollDelta = 0;

            service.handleVerticalScroll();

            expect(mockRenderCalendarGrid.moveGridVertical).not.toHaveBeenCalled();
            expect(mockRenderCalendarGrid.renderCalendar).not.toHaveBeenCalled();
        });

        it('should use moveGridVertical for small scroll', () => {
            mockScrollService.verticalScrollDelta = 2;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);

            service.handleVerticalScroll();

            expect(mockRenderCalendarGrid.moveGridVertical).toHaveBeenCalledWith(1);
            expect(mockScrollService.resetDeltas).toHaveBeenCalled();
        });

        it('should use renderCalendar for large scroll', () => {
            mockScrollService.verticalScrollDelta = 15;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);

            service.handleVerticalScroll();

            expect(mockRenderCalendarGrid.renderCalendar).toHaveBeenCalled();
            expect(mockScrollService.resetDeltas).toHaveBeenCalled();
        });

        it('should pass direction -1 for negative scrollDelta', () => {
            mockScrollService.verticalScrollDelta = -3;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);

            service.handleVerticalScroll();

            expect(mockRenderCalendarGrid.moveGridVertical).toHaveBeenCalledWith(-1);
        });

        it('should fallback to renderCalendar on error', () => {
            mockScrollService.verticalScrollDelta = 2;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);
            mockRenderCalendarGrid.moveGridVertical.mockImplementation(() => {
                throw new Error('test');
            });

            service.handleVerticalScroll();

            expect(mockRenderCalendarGrid.renderCalendar).toHaveBeenCalled();
            expect(mockScrollService.resetDeltas).toHaveBeenCalled();
        });
    });

    describe('moveCalendar', () => {
        it('should return early when busy', () => {
            service.isBusy = true;

            service.moveCalendar(false, true);

            expect(mockRenderCalendarGrid.moveGridVertical).not.toHaveBeenCalled();
            expect(mockRenderCalendarGrid.renderCalendar).not.toHaveBeenCalled();
        });

        it('should reset isBusy after completion', () => {
            mockScrollService.verticalScrollDelta = 0;

            service.moveCalendar(false, true);

            expect(service.isBusy).toBe(false);
        });
    });

    describe('isSelectedRowVisible', () => {
        it('should return true when row is within visible range', () => {
            mockRenderCalendarGrid.selectedRow = 5;
            mockScrollService.verticalScrollPosition = 0;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);
            mockRows = 100;

            expect(service.isSelectedRowVisible()).toBe(true);
        });

        it('should return false when row is before visible range', () => {
            mockRenderCalendarGrid.selectedRow = 0;
            mockScrollService.verticalScrollPosition = 5;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);
            mockRows = 100;

            expect(service.isSelectedRowVisible()).toBe(false);
        });

        it('should return false when row exceeds total rows', () => {
            mockRenderCalendarGrid.selectedRow = 110;
            mockScrollService.verticalScrollPosition = 0;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);
            mockRows = 100;

            expect(service.isSelectedRowVisible()).toBe(false);
        });
    });

    describe('isDragRowVisible', () => {
        it('should return true when drag row is within visible range', () => {
            service.dragRow = 5;
            mockScrollService.verticalScrollPosition = 0;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);
            mockRows = 100;

            expect(service.isDragRowVisible()).toBe(true);
        });

        it('should return false when drag row is -1', () => {
            service.dragRow = -1;

            expect(service.isDragRowVisible()).toBe(false);
        });

        it('should return false when drag row is before visible range', () => {
            service.dragRow = 0;
            mockScrollService.verticalScrollPosition = 5;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);
            mockRows = 100;

            expect(service.isDragRowVisible()).toBe(false);
        });

        it('should return false when drag row exceeds total rows', () => {
            service.dragRow = 110;
            mockScrollService.verticalScrollPosition = 0;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);
            mockRows = 100;

            expect(service.isDragRowVisible()).toBe(false);
        });
    });

    describe('SetColumns', () => {
        it('should set 365 for non-leap year', () => {
            mockCurrentYear = 2023;

            service.SetColumns();

            expect(service.columns).toBe(365);
            expect(mockScrollService.maxCols).toBe(365);
        });

        it('should set 366 for leap year', () => {
            mockCurrentYear = 2024;

            service.SetColumns();

            expect(service.columns).toBe(366);
            expect(mockScrollService.maxCols).toBe(366);
        });
    });

    describe('calcX2Column', () => {
        it('should calculate column from x position', () => {
            mockCalendarSetting.cellWidth = 10;
            mockScrollService.horizontalScrollPosition = 0;

            expect(service.calcX2Column(50)).toBe(5);
        });

        it('should include horizontal scroll offset', () => {
            mockCalendarSetting.cellWidth = 10;
            mockScrollService.horizontalScrollPosition = 10;

            expect(service.calcX2Column(50)).toBe(15);
        });

        it('should floor the result', () => {
            mockCalendarSetting.cellWidth = 10;
            mockScrollService.horizontalScrollPosition = 0;

            expect(service.calcX2Column(55)).toBe(5);
        });
    });

    describe('selectedRowBreaksMaxIndex', () => {
        it('should return length of breaks array', () => {
            mockRenderCalendarGrid.selectedRow = 3;
            mockDataManagementBreak.readData.mockReturnValue([
                { id: '1' }, { id: '2' }, { id: '3' }
            ]);

            expect(service.selectedRowBreaksMaxIndex).toBe(3);
        });

        it('should return 0 when readData returns null', () => {
            mockRenderCalendarGrid.selectedRow = 3;
            mockDataManagementBreak.readData.mockReturnValue(null);

            expect(service.selectedRowBreaksMaxIndex).toBe(0);
        });

        it('should return 0 when readData returns empty array', () => {
            mockRenderCalendarGrid.selectedRow = 3;
            mockDataManagementBreak.readData.mockReturnValue([]);

            expect(service.selectedRowBreaksMaxIndex).toBe(0);
        });
    });

    describe('canvas delegation', () => {
        it('createCanvas should delegate', () => {
            service.createCanvas();

            expect(mockGanttCanvasManager.createCanvas).toHaveBeenCalled();
        });

        it('deleteCanvas should delegate', () => {
            service.deleteCanvas();

            expect(mockGanttCanvasManager.deleteCanvas).toHaveBeenCalled();
        });

        it('isCanvasAvailable should delegate', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);

            expect(service.isCanvasAvailable()).toBe(true);
        });
    });

    describe('width/height', () => {
        it('should get width from ganttCanvasManager', () => {
            mockGanttCanvasManager.width = 1024;

            expect(service.width).toBe(1024);
        });

        it('should set width on ganttCanvasManager', () => {
            service.width = 1280;

            expect(mockGanttCanvasManager.width).toBe(1280);
        });
    });

    describe('firstVisibleRow', () => {
        it('should return verticalScrollPosition', () => {
            mockScrollService.verticalScrollPosition = 7;

            expect(service.firstVisibleRow).toBe(7);
        });
    });

    describe('lastVisibleRow', () => {
        it('should return firstVisibleRow + visibleRow', () => {
            mockScrollService.verticalScrollPosition = 5;
            mockRenderCalendarGrid.visibleRow.mockReturnValue(20);

            expect(service.lastVisibleRow()).toBe(25);
        });
    });

    describe('startDate', () => {
        it('getter should delegate', () => {
            const date = new Date(2025, 0, 1);
            mockRenderCalendarGrid.startDate = date;

            expect(service.startDate).toBe(date);
        });
    });
});
