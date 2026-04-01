// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { CalendarCalculationService } from './calendar-calculation.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { ScrollService } from '../../../../shared/scrollbar/scroll.service';
import { HolidayCollectionService } from '../../../../shared/grid/services/holiday-collection.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { GanttCoordinateService } from '../gantt-coordinate.service';

describe('CalendarCalculationService', () => {
    let service: CalendarCalculationService;
    let mockCalendarSetting: any;
    let mockScroll: any;
    let mockHolidayCollection: any;
    let mockGanttCanvasManager: any;
    let mockDataManagementBreak: any;

    let mockCurrentYear: number;
    let mockHorizontalScrollPosition: number;
    let mockVerticalScrollPosition: number;
    let mockClients: any[];

    beforeEach(() => {
        mockCalendarSetting = {
            cellWidth: 10,
            cellHeight: 30,
            monthHeaderHeight: 20,
            cellHeaderHeight: 50,
            anchorWidth: 5
        };

        mockCurrentYear = 2024;
        mockHorizontalScrollPosition = 0;
        mockVerticalScrollPosition = 0;
        mockClients = [
            {
                membership: {
                    validFrom: new Date(2024, 0, 15),
                    validUntil: new Date(2024, 11, 20),
                },
            },
        ];

        mockScroll = {
            dummy: vi.fn()
        };
        Object.defineProperty(mockScroll, 'horizontalScrollPosition', {
            get: () => mockHorizontalScrollPosition,
            set: (value: number) => { mockHorizontalScrollPosition = value; },
            configurable: true
        });
        Object.defineProperty(mockScroll, 'verticalScrollPosition', {
            get: () => mockVerticalScrollPosition,
            set: (value: number) => { mockVerticalScrollPosition = value; },
            configurable: true
        });

        mockHolidayCollection = {
            dummy: vi.fn()
        };
        Object.defineProperty(mockHolidayCollection, 'currentYear', {
            get: () => mockCurrentYear,
            set: (value: number) => { mockCurrentYear = value; },
            configurable: true
        });

        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 800;
        mockCanvas.height = 600;

        mockGanttCanvasManager = {
            isCanvasAvailable: vi.fn(),
            renderCanvas: mockCanvas,
            width: 800,
            height: 600
        };
        mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);

        mockDataManagementBreak = {
            dummy: vi.fn()
        };
        Object.defineProperty(mockDataManagementBreak, 'clients', {
            get: () => mockClients,
            set: (value: any[]) => { mockClients = value; },
            configurable: true
        });

        TestBed.configureTestingModule({
            providers: [
                CalendarCalculationService,
                { provide: CalendarSettingService, useValue: mockCalendarSetting },
                { provide: ScrollService, useValue: mockScroll },
                { provide: HolidayCollectionService, useValue: mockHolidayCollection },
                { provide: GanttCanvasManagerService, useValue: mockGanttCanvasManager },
                {
                    provide: DataManagementBreakPlaceholderService,
                    useValue: mockDataManagementBreak,
                },
                {
                    provide: GanttCoordinateService,
                    useValue: {
                        update: vi.fn(),
                        scrollDx: 0,
                        columnX: vi.fn().mockImplementation((col: number) => col * mockCalendarSetting.cellWidth),
                        columnRight: vi.fn().mockImplementation((col: number) => col * mockCalendarSetting.cellWidth + mockCalendarSetting.cellWidth),
                        spanLeft: vi.fn().mockImplementation((start: number) => start * mockCalendarSetting.cellWidth),
                        spanRight: vi.fn().mockImplementation((_start: number, end: number) => end * mockCalendarSetting.cellWidth + mockCalendarSetting.cellWidth),
                        mouseToColumn: vi.fn().mockImplementation((mouseX: number) => Math.floor(mouseX / mockCalendarSetting.cellWidth) + mockHorizontalScrollPosition),
                    },
                },
            ],
        });

        service = TestBed.inject(CalendarCalculationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('updateStartDate', () => {
        it('should set startDate to January 1st of given year', () => {
            service.updateStartDate(2025);

            expect(service.startDate.getFullYear()).toBe(2025);
            expect(service.startDate.getMonth()).toBe(0);
            expect(service.startDate.getDate()).toBe(1);
        });
    });

    describe('calcDaysPerYear', () => {
        it('should return 366 for leap year', () => {
            mockCurrentYear = 2024;

            expect(service.calcDaysPerYear()).toBe(366);
        });

        it('should return 365 for non-leap year', () => {
            mockCurrentYear = 2023;

            expect(service.calcDaysPerYear()).toBe(365);
        });
    });

    describe('getWidth', () => {
        it('should calculate width for leap year', () => {
            mockCurrentYear = 2024;

            const expectedWidth = mockCalendarSetting.cellWidth * 366 + 1;
            expect(service.getWidth()).toBe(expectedWidth);
        });

        it('should calculate width for non-leap year', () => {
            mockCurrentYear = 2023;

            const expectedWidth = mockCalendarSetting.cellWidth * 365 + 1;
            expect(service.getWidth()).toBe(expectedWidth);
        });
    });

    describe('calculateDayRectangle', () => {
        it('should calculate correct rectangle for day index', () => {
            const dayIndex = 5;
            const rect = service.calculateDayRectangle(dayIndex);

            const expectedLeft = Math.floor(dayIndex * mockCalendarSetting.cellWidth);
            const expectedRight = Math.floor(dayIndex * mockCalendarSetting.cellWidth +
                mockCalendarSetting.cellWidth);

            expect(rect.left).toBe(expectedLeft);
            expect(rect.top).toBe(0);
            expect(rect.right).toBe(expectedRight);
            expect(rect.bottom).toBe(mockCalendarSetting.cellHeaderHeight);
        });
    });

    describe('calculateHeaderDayRect', () => {
        it('should use logical cellHeight instead of physical canvas height', () => {
            const dayRect = new Rectangle(10, 0, 20, 50);

            const result = service.calculateHeaderDayRect(dayRect, false);

            expect(result.top).toBe(mockCalendarSetting.monthHeaderHeight);
            expect(result.bottom).toBe(mockCalendarSetting.cellHeaderHeight);
        });

        it('should position day number on left for non-Saturday', () => {
            const dayRect = new Rectangle(100, 0, 110, 50);

            const result = service.calculateHeaderDayRect(dayRect, false);

            expect(result.left).toBe(dayRect.left);
            expect(result.right).toBe(dayRect.left + 20);
        });

        it('should position day number on right for Saturday', () => {
            const dayRect = new Rectangle(100, 0, 110, 50);

            const result = service.calculateHeaderDayRect(dayRect, true);

            expect(result.left).toBe(dayRect.right - 20);
            expect(result.right).toBe(dayRect.right);
        });

        it('should not depend on canvas physical dimensions for HiDPI compatibility', () => {
            const dayRect = new Rectangle(0, 0, 10, 50);

            const result = service.calculateHeaderDayRect(dayRect, false);

            const expectedRankHeight = mockCalendarSetting.cellHeaderHeight -
                mockCalendarSetting.monthHeaderHeight;

            expect(result.height).toBe(expectedRankHeight);
        });
    });

    describe('calcRowRec', () => {
        it('should calculate row rectangle correctly', () => {
            const index = 5;
            const verticalScrollPosition = 2;
            const cellHeight = 30;

            const rect = service.calcRowRec(index, verticalScrollPosition, cellHeight);

            const expectedDy = index - verticalScrollPosition;
            const expectedTop = Math.floor(expectedDy * cellHeight);

            expect(rect.left).toBe(0);
            expect(rect.top).toBe(expectedTop);
            expect(rect.right).toBe(mockGanttCanvasManager.renderCanvas!.width);
            expect(rect.bottom).toBe(expectedTop + cellHeight);
        });
    });

    describe('calcDateRectangle', () => {
        it('should calculate rectangle for date range', () => {
            const beginDate = new Date(2024, 0, 10);
            const endDate = new Date(2024, 0, 15);

            service.startDate = new Date(2024, 0, 1);

            const rect = service.calcDateRectangle(beginDate, endDate);

            const expectedCol1 = 9;
            const expectedWidth = (expectedCol1 + 5) * mockCalendarSetting.cellWidth -
                expectedCol1 * mockCalendarSetting.cellWidth +
                mockCalendarSetting.cellWidth;

            expect(rect.width).toBe(expectedWidth);
        });

        it('should position rectangle at correct vertical layer', () => {
            const beginDate = new Date(2024, 0, 1);
            const endDate = new Date(2024, 0, 5);

            service.startDate = new Date(2024, 0, 1);

            const rect = service.calcDateRectangle(beginDate, endDate);

            const cellLayerHeight = Math.floor(mockCalendarSetting.cellHeight / 4);

            expect(rect.top).toBe(cellLayerHeight);
            expect(rect.bottom).toBe(cellLayerHeight * 3);
        });
    });

    describe('calcLayeredRectangle', () => {
        it('should return same rectangle for layer 0', () => {
            const baseRec = new Rectangle(10, 20, 30, 40);

            const result = service.calcLayeredRectangle(baseRec, 0);

            expect(result).toEqual(baseRec);
        });

        it('should offset upward for odd layers', () => {
            const baseRec = new Rectangle(10, 20, 30, 40);

            const result = service.calcLayeredRectangle(baseRec, 1);

            expect(result.top).toBe(baseRec.top - 3);
            expect(result.bottom).toBe(baseRec.bottom - 3);
        });

        it('should offset downward for even layers', () => {
            const baseRec = new Rectangle(10, 20, 30, 40);

            const result = service.calcLayeredRectangle(baseRec, 2);

            expect(result.top).toBe(baseRec.top + 3);
            expect(result.bottom).toBe(baseRec.bottom + 3);
        });

        it('should increase offset for higher layers', () => {
            const baseRec = new Rectangle(10, 20, 30, 40);

            const result3 = service.calcLayeredRectangle(baseRec, 3);
            const result5 = service.calcLayeredRectangle(baseRec, 5);

            expect(Math.abs(result5.top - baseRec.top)).toBeGreaterThan(Math.abs(result3.top - baseRec.top));
        });
    });

    describe('calcLeftAnchorRectangle', () => {
        it('should position anchor on left side of rectangle', () => {
            const rec = new Rectangle(100, 50, 200, 80);

            const anchor = service.calcLeftAnchorRectangle(rec);

            expect(anchor.right).toBe(rec.left);
            expect(anchor.left).toBe(rec.left - mockCalendarSetting.anchorWidth);
        });

        it('should center anchor vertically', () => {
            const rec = new Rectangle(100, 50, 200, 80);

            const anchor = service.calcLeftAnchorRectangle(rec);

            const expectedTop = rec.top + rec.height / 2 - mockCalendarSetting.anchorWidth / 2;
            expect(anchor.top).toBe(expectedTop);
            expect(anchor.height).toBe(mockCalendarSetting.anchorWidth);
        });
    });

    describe('calcRightAnchorRectangle', () => {
        it('should position anchor on right side of rectangle', () => {
            const rec = new Rectangle(100, 50, 200, 80);

            const anchor = service.calcRightAnchorRectangle(rec);

            expect(anchor.left).toBe(rec.right);
            expect(anchor.right).toBe(rec.right + mockCalendarSetting.anchorWidth);
        });

        it('should center anchor vertically', () => {
            const rec = new Rectangle(100, 50, 200, 80);

            const anchor = service.calcRightAnchorRectangle(rec);

            const expectedTop = rec.top + rec.height / 2 - mockCalendarSetting.anchorWidth / 2;
            expect(anchor.top).toBe(expectedTop);
            expect(anchor.height).toBe(mockCalendarSetting.anchorWidth);
        });
    });

    describe('calcValidFromColumn', () => {
        it('should return correct column for valid membership date', () => {
            service.startDate = new Date(2024, 0, 1);

            const column = service.calcValidFromColumn(0);

            expect(column).toBe(14);
        });

        it('should return -1 for invalid client index', () => {
            expect(service.calcValidFromColumn(-1)).toBe(-1);
            expect(service.calcValidFromColumn(999)).toBe(-1);
        });

        it('should return -1 for client without validFrom', () => {
            mockDataManagementBreak.clients = [
                {
                    membership: {},
                },
            ] as any;

            expect(service.calcValidFromColumn(0)).toBe(-1);
        });

        it('should return -1 for invalid date', () => {
            mockDataManagementBreak.clients = [
                {
                    membership: {
                        validFrom: 'invalid-date',
                    },
                },
            ] as any;

            expect(service.calcValidFromColumn(0)).toBe(-1);
        });
    });

    describe('calcValidUntilColumn', () => {
        it('should return correct column for valid membership date', () => {
            service.startDate = new Date(2024, 0, 1);

            const column = service.calcValidUntilColumn(0);

            expect(column).toBeGreaterThan(0);
            expect(column).toBeLessThan(366);
        });

        it('should return -1 for invalid client index', () => {
            expect(service.calcValidUntilColumn(-1)).toBe(-1);
            expect(service.calcValidUntilColumn(999)).toBe(-1);
        });

        it('should return -1 for client without validUntil', () => {
            mockDataManagementBreak.clients = [
                {
                    membership: {},
                },
            ] as any;

            expect(service.calcValidUntilColumn(0)).toBe(-1);
        });

        it('should return -1 for date in different year', () => {
            service.startDate = new Date(2024, 0, 1);
            mockDataManagementBreak.clients = [
                {
                    membership: {
                        validUntil: new Date(2023, 5, 15),
                    },
                },
            ] as any;

            expect(service.calcValidUntilColumn(0)).toBe(-1);
        });

        it('should add endOfDay offset to column calculation', () => {
            service.startDate = new Date(2024, 0, 1);
            mockDataManagementBreak.clients = [
                {
                    membership: {
                        validUntil: new Date(2024, 0, 10),
                    },
                },
            ] as any;

            const column = service.calcValidUntilColumn(0);

            expect(column).toBe(10);
        });
    });

    describe('firstVisibleColumn', () => {
        it('should return horizontal scroll position', () => {
            mockHorizontalScrollPosition = 25;

            expect(service.firstVisibleColumn()).toBe(25);
        });
    });

    describe('lastVisibleColumn', () => {
        it('should calculate last visible column correctly', () => {
            mockHorizontalScrollPosition = 10;
            mockCurrentYear = 2024;

            const visibleCol = Math.ceil(mockGanttCanvasManager.width / mockCalendarSetting.cellWidth);
            const expected = 10 + visibleCol;

            expect(service.lastVisibleColumn()).toBe(expected);
        });

        it('should not exceed maximum days in year for leap year', () => {
            mockHorizontalScrollPosition = 300;
            mockCurrentYear = 2024;

            expect(service.lastVisibleColumn()).toBe(366);
        });

        it('should not exceed maximum days in year for non-leap year', () => {
            mockHorizontalScrollPosition = 300;
            mockCurrentYear = 2023;

            expect(service.lastVisibleColumn()).toBe(365);
        });
    });

    describe('visibleCol', () => {
        it('should calculate visible columns based on canvas width', () => {
            const expected = Math.ceil(mockGanttCanvasManager.width / mockCalendarSetting.cellWidth);

            expect(service.visibleCol()).toBe(expected);
        });

        it('should return 0 when canvas is not available', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(false);

            expect(service.visibleCol()).toBe(0);
        });
    });

    describe('visibleRow', () => {
        it('should calculate visible rows based on canvas height', () => {
            const expected = Math.ceil(mockGanttCanvasManager.height / mockCalendarSetting.cellHeight);

            expect(service.visibleRow()).toBe(expected);
        });

        it('should return 0 when canvas is not available', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(false);

            expect(service.visibleRow()).toBe(0);
        });
    });

    describe('firstVisibleRow', () => {
        it('should return vertical scroll position', () => {
            mockVerticalScrollPosition = 15;

            expect(service.firstVisibleRow).toBe(15);
        });
    });
});
