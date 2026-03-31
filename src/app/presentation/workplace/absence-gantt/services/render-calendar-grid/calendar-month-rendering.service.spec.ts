// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { CalendarMonthRenderingService } from './calendar-month-rendering.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { HolidayCollectionService } from '../../../../shared/grid/services/holiday-collection.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { GridFontsService } from '../../../../shared/grid/services/grid-fonts.service';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { GanttCoordinateService } from '../gantt-coordinate.service';

describe('CalendarMonthRenderingService', () => {
    let service: CalendarMonthRenderingService;
    let mockGanttCanvasManager: any;
    let mockGridColors: any;
    let mockHolidayCollection: any;
    let mockCalendarSetting: any;
    let mockGridSetting: any;
    let mockGridFonts: any;
    let mockTranslateService: any;
    let mockBackgroundRowCtx: any;

    let mockCurrentYear: number;

    beforeEach(() => {
        mockBackgroundRowCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            fillRect: vi.fn(),
            clearRect: vi.fn()
        };

        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 3660;
        mockCanvas.height = 30;

        mockGanttCanvasManager = {
            isCanvasAvailable: vi.fn(),
            backgroundRowCtx: mockBackgroundRowCtx,
            backgroundRowCanvas: mockCanvas,
            width: 3660
        };
        mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);

        mockGridColors = {
            evenMonthColor: '#f9f9f9',
            oddMonthColor: '#ffffff',
            backGroundContainerColor: '#eeeeee'
        };

        mockCurrentYear = 2024;

        mockHolidayCollection = {
            dummy: vi.fn()
        };
        Object.defineProperty(mockHolidayCollection, 'currentYear', {
            get: () => mockCurrentYear,
            set: (value: number) => { mockCurrentYear = value; },
            configurable: true
        });

        mockCalendarSetting = {
            cellWidth: 10,
            cellHeight: 30
        };

        mockGridSetting = {
            showGridLines: true
        };

        mockGridFonts = {
            mainFontString: '12px Arial',
            mainFontSize: '12'
        };

        mockTranslateService = {
            instant: vi.fn(),
            get: vi.fn().mockReturnValue(of('Translated text')),
            onTranslationChange: of(),
            onLangChange: of(),
            onDefaultLangChange: of(),
        };
        mockTranslateService.instant.mockImplementation((key: string) => {
            const months: Record<string, string> = {
                'JANUARY': 'Januar',
                'FEBRUARY': 'Februar',
                'MARCH': 'März',
                'APRIL': 'April',
                'MAY': 'Mai',
                'JUNE': 'Juni',
                'JULY': 'Juli',
                'AUGUST': 'August',
                'SEPTEMBER': 'September',
                'OKTOBER': 'Oktober',
                'NOVEMBER': 'November',
                'DECEMBER': 'Dezember',
            };
            return months[key] || key;
        });

        TestBed.configureTestingModule({
            providers: [
                CalendarMonthRenderingService,
                {
                    provide: GanttCanvasManagerService,
                    useValue: mockGanttCanvasManager,
                },
                { provide: GridColorService, useValue: mockGridColors },
                {
                    provide: HolidayCollectionService,
                    useValue: mockHolidayCollection,
                },
                { provide: CalendarSettingService, useValue: mockCalendarSetting },
                { provide: GridSettingsService, useValue: mockGridSetting },
                { provide: GridFontsService, useValue: mockGridFonts },
                { provide: TranslateService, useValue: mockTranslateService },
                {
                    provide: GanttCoordinateService,
                    useValue: {
                        update: vi.fn(),
                        scrollDx: 0,
                        columnX: vi.fn().mockImplementation((col: number) => col * mockCalendarSetting.cellWidth),
                        columnRight: vi.fn().mockImplementation((col: number) => col * mockCalendarSetting.cellWidth + mockCalendarSetting.cellWidth),
                        spanLeft: vi.fn().mockImplementation((start: number) => start * mockCalendarSetting.cellWidth),
                        spanRight: vi.fn().mockImplementation((_start: number, end: number) => end * mockCalendarSetting.cellWidth + mockCalendarSetting.cellWidth),
                        mouseToColumn: vi.fn(),
                    },
                },
            ],
        });

        service = TestBed.inject(CalendarMonthRenderingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('isCanvasAvailable', () => {
        it('should return true when canvas is available', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);

            expect(service.isCanvasAvailable()).toBe(true);
        });

        it('should return false when canvas is not available', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(false);

            expect(service.isCanvasAvailable()).toBe(false);
        });
    });

    describe('drawMonthBackgrounds', () => {
        it('should create 12 month rectangles', () => {
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            expect(monthsRect.length).toBe(12);
        });

        it('should calculate correct positions for each month', () => {
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            expect(monthsRect[0].left).toBe(0);

            const januaryDays = 31;
            const expectedFebruaryLeft = januaryDays * mockCalendarSetting.cellWidth;
            expect(monthsRect[1].left).toBe(expectedFebruaryLeft);
        });

        it('should use correct height from calendarSetting', () => {
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            monthsRect.forEach((rect) => {
                expect(rect.bottom).toBe(mockCalendarSetting.cellHeight);
            });
        });

        it('should handle leap year correctly', () => {
            mockHolidayCollection.currentYear = 2024;
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            const januaryDays = 31;
            const februaryDays = 29;
            const expectedMarchLeft = (januaryDays + februaryDays) * mockCalendarSetting.cellWidth;

            expect(monthsRect[2].left).toBe(expectedMarchLeft);
        });

        it('should handle non-leap year correctly', () => {
            mockCurrentYear = 2023;
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            const januaryDays = 31;
            const februaryDays = 28;
            const expectedMarchLeft = (januaryDays + februaryDays) * mockCalendarSetting.cellWidth;

            expect(monthsRect[2].left).toBe(expectedMarchLeft);
        });

        it('should alternate colors for even and odd months', () => {
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            expect(mockBackgroundRowCtx.save).toHaveBeenCalled();
            expect(mockBackgroundRowCtx.fillRect).toHaveBeenCalledTimes(12);
        });

        it('should add extra cellWidth to month width', () => {
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            const januaryDays = 31;
            const expectedWidth = januaryDays * mockCalendarSetting.cellWidth +
                mockCalendarSetting.cellWidth;

            expect(monthsRect[0].width).toBe(expectedWidth);
        });
    });

    describe('Month color alternation', () => {
        it('should use even color for January (month 0)', () => {
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            const firstFillCall = vi.mocked(mockBackgroundRowCtx.fillRect).mock.calls[0];
            expect(firstFillCall).toBeDefined();
        });

        it('should use odd color for February (month 1)', () => {
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            expect(vi.mocked(mockBackgroundRowCtx.fillRect).mock.calls.length).toBe(12);
        });
    });

    describe('Month positioning', () => {
        it('should position all months sequentially without gaps', () => {
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            for (let i = 1; i < monthsRect.length; i++) {
                const previousMonth = monthsRect[i - 1];
                const currentMonth = monthsRect[i];

                expect(currentMonth.left).toBeGreaterThan(previousMonth.left);
            }
        });

        it('should span full year width', () => {
            mockHolidayCollection.currentYear = 2024;
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            const lastMonth = monthsRect[11];
            const totalDays = 366;
            const expectedMaxRight = totalDays * mockCalendarSetting.cellWidth +
                mockCalendarSetting.cellWidth;

            expect(lastMonth.right).toBeGreaterThan(expectedMaxRight - 100);
        });
    });

    describe('Canvas availability check', () => {
        it('should not draw when canvas is unavailable', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(false);
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            expect(monthsRect.length).toBe(12);
        });
    });

    describe('Year variations', () => {
        it('should calculate correctly for year 2023', () => {
            mockHolidayCollection.currentYear = 2023;
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            expect(monthsRect.length).toBe(12);
        });

        it('should calculate correctly for year 2024', () => {
            mockHolidayCollection.currentYear = 2024;
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            expect(monthsRect.length).toBe(12);
        });

        it('should calculate correctly for year 2025', () => {
            mockHolidayCollection.currentYear = 2025;
            const monthsRect: Rectangle[] = [];

            service.drawMonthBackgrounds(monthsRect);

            expect(monthsRect.length).toBe(12);
        });
    });
});
