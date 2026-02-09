/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { RenderCalendarGridService } from './render-calendar-grid.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { ScrollService } from '../../../../shared/scrollbar/scroll.service';
import { CalendarCalculationService } from './calendar-calculation.service';
import { CalendarDayRenderingService } from './calendar-day-rendering.service';
import { CalendarMonthRenderingService } from './calendar-month-rendering.service';
import { CalendarHeaderRenderingService } from './calendar-header-rendering.service';
import { ValidityPeriodRenderingService } from './validity-period-rendering.service';
import { BreakRenderingService } from './break-rendering.service';
import { RowSelectionService } from './row-selection.service';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';

describe('RenderCalendarGridService', () => {
    let service: RenderCalendarGridService;
    let mockGanttCanvasManager: any;
    let mockGridColors: any;
    let mockCalendarSetting: any;
    let mockDataManagementBreak: any;
    let mockScroll: any;
    let mockCalculationService: any;
    let mockDayRenderingService: any;
    let mockMonthRenderingService: any;
    let mockHeaderRenderingService: any;
    let mockValidityPeriodRenderingService: any;
    let mockBreakRenderingService: any;
    let mockSelectionService: any;
    let mockRows: number;

    beforeEach(() => {
        mockRows = 100;

        const mockCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            clearRect: vi.fn(),
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            rect: vi.fn(),
            clip: vi.fn()
        };

        mockGanttCanvasManager = {
            isCanvasAvailable: vi.fn().mockReturnValue(true),
            ctx: mockCtx,
            canvas: { width: 800, height: 600 },
            renderCanvas: { width: 800, height: 600 },
            renderCanvasCtx: { clearRect: vi.fn(), drawImage: vi.fn() },
            headerCanvas: { width: 800, height: 55 },
            headerCtx: { drawImage: vi.fn() },
            backgroundRowCanvas: { width: 800, height: 45 },
            backgroundRowCtx: mockCtx,
            rowCanvas: { width: 800, height: 45 },
            rowCtx: { drawImage: vi.fn(), restore: vi.fn() },
            width: 800,
            height: 600,
            resizeBackgroundRowCanvas: vi.fn(),
            resizeRowCanvas: vi.fn(),
            resizeHeaderCanvas: vi.fn()
        };

        mockGridColors = {
            backGroundContainerColor: '#ffffff',
            focusBorderColor: '#0000ff'
        };

        mockCalendarSetting = {
            cellWidth: 8,
            cellHeight: 45,
            cellHeaderHeight: 55
        };

        mockDataManagementBreak = {
            readData: vi.fn().mockReturnValue([])
        };
        Object.defineProperty(mockDataManagementBreak, 'rows', {
            get: () => mockRows,
            set: (v: number) => { mockRows = v; },
            configurable: true
        });

        mockScroll = {
            verticalScrollPosition: 0,
            horizontalScrollPosition: 0,
            verticalScrollDelta: 0
        };

        mockCalculationService = {
            startDate: new Date(2024, 0, 1),
            firstVisibleRow: 0,
            updateStartDate: vi.fn(),
            calcDaysPerYear: vi.fn().mockReturnValue(366),
            getWidth: vi.fn().mockReturnValue(2929),
            calculateDayRectangle: vi.fn().mockReturnValue(new Rectangle(0, 0, 8, 55)),
            calculateHeaderDayRect: vi.fn().mockReturnValue(new Rectangle(0, 45, 20, 55)),
            calcRowRec: vi.fn().mockReturnValue(new Rectangle(0, 0, 800, 45)),
            calcDateRectangle: vi.fn().mockReturnValue(new Rectangle(0, 11, 80, 33)),
            calcLayeredRectangle: vi.fn().mockReturnValue(new Rectangle(0, 11, 80, 33)),
            calcLeftAnchorRectangle: vi.fn().mockReturnValue(new Rectangle(-10, 17, 0, 27)),
            calcRightAnchorRectangle: vi.fn().mockReturnValue(new Rectangle(80, 17, 90, 27)),
            firstVisibleColumn: vi.fn().mockReturnValue(0),
            lastVisibleColumn: vi.fn().mockReturnValue(100),
            visibleCol: vi.fn().mockReturnValue(100),
            visibleRow: vi.fn().mockReturnValue(13)
        };

        mockDayRenderingService = {
            drawDayBackgrounds: vi.fn()
        };

        mockMonthRenderingService = {
            drawMonthBackgrounds: vi.fn(),
            drawMonthBorder: vi.fn(),
            drawMonthBarOnHeadline: vi.fn()
        };

        mockHeaderRenderingService = {
            copyRulerOnHeadline: vi.fn(),
            drawWeekendDayNumberOnHeadline: vi.fn()
        };

        mockValidityPeriodRenderingService = {
            drawPreValidFromGrayRectangle: vi.fn(),
            drawPostValidUntilGrayRectangle: vi.fn()
        };

        mockBreakRenderingService = {
            drawRowBreaks: vi.fn(),
            getRecommendedRowHeight: vi.fn().mockReturnValue(45),
            drawBreakIntern: vi.fn(),
            drawBreakSelectBorderIntern: vi.fn(),
            drawBreakSelectBorderInternAnchor: vi.fn()
        };

        mockSelectionService = {
            selectedRow: 0,
            selectedBreakIndex: -1,
            selectedBreakRec: undefined,
            selectedBreak: undefined,
            selectedBreak_dummy: undefined,
            drawSelectionRow: vi.fn(),
            drawSelectedBreak: vi.fn(),
            isSelectedRowVisible: vi.fn().mockReturnValue(false),
            isSelectedBreak_Dirty: vi.fn().mockReturnValue(false),
            checkSelectedRowVisibility: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                RenderCalendarGridService,
                { provide: GanttCanvasManagerService, useValue: mockGanttCanvasManager },
                { provide: GridColorService, useValue: mockGridColors },
                { provide: CalendarSettingService, useValue: mockCalendarSetting },
                { provide: DataManagementBreakPlaceholderService, useValue: mockDataManagementBreak },
                { provide: ScrollService, useValue: mockScroll },
                { provide: CalendarCalculationService, useValue: mockCalculationService },
                { provide: CalendarDayRenderingService, useValue: mockDayRenderingService },
                { provide: CalendarMonthRenderingService, useValue: mockMonthRenderingService },
                { provide: CalendarHeaderRenderingService, useValue: mockHeaderRenderingService },
                { provide: ValidityPeriodRenderingService, useValue: mockValidityPeriodRenderingService },
                { provide: BreakRenderingService, useValue: mockBreakRenderingService },
                { provide: RowSelectionService, useValue: mockSelectionService }
            ]
        });

        service = TestBed.inject(RenderCalendarGridService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('renderCalendar', () => {
        it('should iterate over visibleRow + 1 rows', () => {
            mockCalculationService.visibleRow.mockReturnValue(5);
            mockScroll.verticalScrollPosition = 0;

            service.renderCalendar();

            expect(mockBreakRenderingService.drawRowBreaks).toHaveBeenCalledTimes(6);
        });

        it('should apply vertical scroll offset', () => {
            mockCalculationService.visibleRow.mockReturnValue(2);
            mockScroll.verticalScrollPosition = 10;

            service.renderCalendar();

            expect(mockCalculationService.calcRowRec).toHaveBeenCalledWith(10, 10, 45);
            expect(mockCalculationService.calcRowRec).toHaveBeenCalledWith(11, 10, 45);
            expect(mockCalculationService.calcRowRec).toHaveBeenCalledWith(12, 10, 45);
        });
    });

    describe('moveGridVertical', () => {
        it('should return early when direction is 0', () => {
            service.moveGridVertical(0);

            expect(mockGanttCanvasManager.renderCanvasCtx.clearRect).not.toHaveBeenCalled();
        });

        it('should return early when diff is 0', () => {
            mockScroll.verticalScrollDelta = 0;

            service.moveGridVertical(1);

            expect(mockGanttCanvasManager.renderCanvasCtx.clearRect).not.toHaveBeenCalled();
        });

        it('should not crash on error', () => {
            mockScroll.verticalScrollDelta = 2;

            expect(() => service.moveGridVertical(1)).not.toThrow();
        });
    });

    describe('selectedRow', () => {
        it('setter should unDraw old and draw new selection when value changes', () => {
            mockSelectionService.selectedRow = 5;
            mockSelectionService.isSelectedRowVisible.mockReturnValue(false);

            service.selectedRow = 10;

            expect(mockSelectionService.selectedRow).toBe(10);
            expect(mockSelectionService.drawSelectionRow).toHaveBeenCalled();
        });

        it('setter should not trigger redraw when value is same', () => {
            mockSelectionService.selectedRow = 5;

            service.selectedRow = 5;

            expect(mockSelectionService.drawSelectionRow).not.toHaveBeenCalled();
        });

        it('getter should delegate to selectionService', () => {
            mockSelectionService.selectedRow = 42;

            expect(service.selectedRow).toBe(42);
        });
    });

    describe('selectedBreakIndex', () => {
        it('setter should trigger redraw', () => {
            mockSelectionService.isSelectedRowVisible.mockReturnValue(false);

            service.selectedBreakIndex = 3;

            expect(mockSelectionService.selectedBreakIndex).toBe(3);
            expect(mockSelectionService.drawSelectionRow).toHaveBeenCalled();
            expect(mockSelectionService.drawSelectedBreak).toHaveBeenCalled();
        });

        it('getter should delegate to selectionService', () => {
            mockSelectionService.selectedBreakIndex = 7;

            expect(service.selectedBreakIndex).toBe(7);
        });
    });

    describe('delegation', () => {
        it('startDate should delegate to calculationService', () => {
            const date = new Date(2025, 0, 1);
            mockCalculationService.startDate = date;

            expect(service.startDate).toBe(date);
        });

        it('visibleCol should delegate', () => {
            mockCalculationService.visibleCol.mockReturnValue(50);

            expect(service.visibleCol()).toBe(50);
        });

        it('visibleRow should delegate', () => {
            mockCalculationService.visibleRow.mockReturnValue(15);

            expect(service.visibleRow()).toBe(15);
        });

        it('firstVisibleColumn should delegate', () => {
            mockCalculationService.firstVisibleColumn.mockReturnValue(20);

            expect(service.firstVisibleColumn()).toBe(20);
        });

        it('lastVisibleColumn should delegate', () => {
            mockCalculationService.lastVisibleColumn.mockReturnValue(200);

            expect(service.lastVisibleColumn()).toBe(200);
        });

        it('drawSelectionRow should delegate', () => {
            service.drawSelectionRow();

            expect(mockSelectionService.drawSelectionRow).toHaveBeenCalled();
        });

        it('drawSelectedBreak should delegate', () => {
            service.drawSelectedBreak();

            expect(mockSelectionService.drawSelectedBreak).toHaveBeenCalled();
        });

        it('isSelectedBreak_Dirty should delegate', () => {
            mockSelectionService.isSelectedBreak_Dirty.mockReturnValue(true);

            expect(service.isSelectedBreak_Dirty()).toBe(true);
        });

        it('checkSelectedRowVisibility should delegate', () => {
            service.checkSelectedRowVisibility();

            expect(mockSelectionService.checkSelectedRowVisibility).toHaveBeenCalled();
        });

        it('selectedBreak should delegate', () => {
            const mockBreak = { id: '1', from: new Date(), until: new Date() };
            mockSelectionService.selectedBreak = mockBreak;

            expect(service.selectedBreak).toBe(mockBreak);
        });

        it('selectedBreakRec getter should delegate', () => {
            const rec = new Rectangle(10, 20, 30, 40);
            mockSelectionService.selectedBreakRec = rec;

            expect(service.selectedBreakRec).toBe(rec);
        });

        it('selectedBreakRec setter should delegate', () => {
            const rec = new Rectangle(10, 20, 30, 40);

            service.selectedBreakRec = rec;

            expect(mockSelectionService.selectedBreakRec).toBe(rec);
        });

        it('updateStartDate should delegate', () => {
            service.updateStartDate(2025);

            expect(mockCalculationService.updateStartDate).toHaveBeenCalledWith(2025);
        });

        it('calcRowRec should delegate', () => {
            service.calcRowRec(5, 0, 45);

            expect(mockCalculationService.calcRowRec).toHaveBeenCalledWith(5, 0, 45);
        });

        it('calcLeftAnchorRectangle should delegate', () => {
            const rec = new Rectangle(10, 20, 30, 40);

            service.calcLeftAnchorRectangle(rec);

            expect(mockCalculationService.calcLeftAnchorRectangle).toHaveBeenCalledWith(rec);
        });

        it('calcRightAnchorRectangle should delegate', () => {
            const rec = new Rectangle(10, 20, 30, 40);

            service.calcRightAnchorRectangle(rec);

            expect(mockCalculationService.calcRightAnchorRectangle).toHaveBeenCalledWith(rec);
        });
    });

    describe('getRecommendedRowHeight', () => {
        it('should delegate to breakRenderingService', () => {
            mockBreakRenderingService.getRecommendedRowHeight.mockReturnValue(60);

            const result = service.getRecommendedRowHeight(5);

            expect(result).toBe(60);
            expect(mockBreakRenderingService.getRecommendedRowHeight).toHaveBeenCalledWith(5, 45);
        });
    });

    describe('isSelectedRowVisible', () => {
        it('should delegate to selectionService', () => {
            mockSelectionService.isSelectedRowVisible.mockReturnValue(true);

            expect(service.isSelectedRowVisible()).toBe(true);
        });
    });

    describe('unDrawSelectionRow', () => {
        it('should not redraw when selectedRow is -1', () => {
            mockSelectionService.selectedRow = -1;

            service.unDrawSelectionRow();

            expect(mockGanttCanvasManager.rowCtx.drawImage).not.toHaveBeenCalled();
        });

        it('should not redraw when row is not visible', () => {
            mockSelectionService.selectedRow = 5;
            mockSelectionService.isSelectedRowVisible.mockReturnValue(false);

            service.unDrawSelectionRow();

            expect(mockBreakRenderingService.drawRowBreaks).not.toHaveBeenCalled();
        });
    });
});
