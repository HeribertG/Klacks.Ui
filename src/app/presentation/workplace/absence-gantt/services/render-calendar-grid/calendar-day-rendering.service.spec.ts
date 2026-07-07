// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { CalendarDayRenderingService } from './calendar-day-rendering.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { HolidayCollectionService } from '../../../../shared/grid/services/holiday-collection.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { CalendarCalculationService } from './calendar-calculation.service';
import { CalendarHeaderDayRank } from 'src/app/domain/models/absence/absence-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';

describe('CalendarDayRenderingService', () => {
    let service: CalendarDayRenderingService;
    let mockGanttCanvasManager: any;
    let mockGridColors: any;
    let mockHolidayCollection: any;
    let mockCalendarSetting: any;
    let mockCalculationService: any;
    let mockCurrentYear: number;
    let fillRectSpy: ReturnType<typeof vi.spyOn>;
    let drawBaseBorderSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mockCurrentYear = 2024;

        fillRectSpy = vi.spyOn(DrawHelper, 'fillRectangle').mockImplementation(() => {});
        drawBaseBorderSpy = vi.spyOn(DrawHelper, 'drawBaseBorder').mockImplementation(() => {});

        mockGanttCanvasManager = {
            isCanvasAvailable: vi.fn().mockReturnValue(true),
            backgroundRowCtx: {}
        };

        mockGridColors = {
            backGroundColorSunday: '#ffe0e0',
            backGroundColorSaturday: '#fff0e0',
            backGroundColorOfficiallyHoliday: '#ffd0d0',
            backGroundColorHolyday: '#ffe8e8',
            borderColor: '#cccccc',
            foreGroundColor: '#000000'
        };

        mockHolidayCollection = {
            holidays: {
                holidayList: []
            }
        };
        Object.defineProperty(mockHolidayCollection, 'currentYear', {
            get: () => mockCurrentYear,
            set: (v: number) => { mockCurrentYear = v; },
            configurable: true
        });

        mockCalendarSetting = {
            cellWidth: 8,
            cellHeight: 45,
            cellHeaderHeight: 55,
            increaseBorder: 0.5
        };

        mockCalculationService = {
            startDate: new Date(2024, 0, 1),
            calculateDayRectangle: vi.fn().mockImplementation((i: number) =>
                new Rectangle(i * 8, 0, (i + 1) * 8, 55)
            ),
            calculateHeaderDayRect: vi.fn().mockReturnValue(new Rectangle(0, 45, 20, 55))
        };

        const mockWeekConfiguration = {
            isWeekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
            getWeekendSlot: (date: Date): 1 | 2 | null => {
                if (date.getDay() === 6) return 1; // Saturday
                if (date.getDay() === 0) return 2; // Sunday
                return null;
            }
        };

        TestBed.configureTestingModule({
            providers: [
                CalendarDayRenderingService,
                { provide: GanttCanvasManagerService, useValue: mockGanttCanvasManager },
                { provide: GridColorService, useValue: mockGridColors },
                { provide: HolidayCollectionService, useValue: mockHolidayCollection },
                { provide: CalendarSettingService, useValue: mockCalendarSetting },
                { provide: CalendarCalculationService, useValue: mockCalculationService },
                { provide: WeekConfigurationService, useValue: mockWeekConfiguration }
            ]
        });

        service = TestBed.inject(CalendarDayRenderingService);
    });

    afterEach(() => {
        fillRectSpy.mockRestore();
        drawBaseBorderSpy.mockRestore();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('drawDayBackgrounds', () => {
        it('should iterate over all days in year', () => {
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(366, headerDayRank);

            expect(mockCalculationService.calculateDayRectangle).toHaveBeenCalledTimes(366);
        });

        it('should iterate 365 times for non-leap year', () => {
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(365, headerDayRank);

            expect(mockCalculationService.calculateDayRectangle).toHaveBeenCalledTimes(365);
        });

        it('should add weekend days to headerDayRank', () => {
            mockCalculationService.startDate = new Date(2024, 0, 1);
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(7, headerDayRank);

            expect(headerDayRank.length).toBeGreaterThan(0);
        });

        it('should detect Saturdays', () => {
            mockCalculationService.startDate = new Date(2024, 0, 1);
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(7, headerDayRank);

            const saturdayEntries = headerDayRank.filter(h => h.backColor === mockGridColors.backGroundColorSaturday);
            expect(saturdayEntries.length).toBeGreaterThan(0);
        });

        it('should detect Sundays', () => {
            mockCalculationService.startDate = new Date(2024, 0, 1);
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(7, headerDayRank);

            const sundayEntries = headerDayRank.filter(h => h.backColor === mockGridColors.backGroundColorSunday);
            expect(sundayEntries.length).toBeGreaterThan(0);
        });

        it('should handle holidays when present', () => {
            mockCalculationService.startDate = new Date(2024, 0, 1);
            mockHolidayCollection.holidays = {
                holidayList: [
                    { currentDate: new Date(2024, 0, 1), officially: true, name: 'New Year' }
                ]
            };
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(1, headerDayRank);

            expect(fillRectSpy).toHaveBeenCalled();
        });

        it('should handle empty holiday list', () => {
            mockHolidayCollection.holidays = { holidayList: [] };
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(1, headerDayRank);

            expect(mockCalculationService.calculateDayRectangle).toHaveBeenCalledTimes(1);
        });

        it('should handle null holidays', () => {
            mockHolidayCollection.holidays = null;
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(1, headerDayRank);

            expect(mockCalculationService.calculateDayRectangle).toHaveBeenCalledTimes(1);
        });

        it('should set day number as name in headerDayRank', () => {
            mockCalculationService.startDate = new Date(2024, 0, 1);
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(7, headerDayRank);

            headerDayRank.forEach(h => {
                expect(h.name).toBeTruthy();
                expect(parseInt(h.name)).toBeGreaterThan(0);
                expect(parseInt(h.name)).toBeLessThanOrEqual(31);
            });
        });

        it('should draw border for weekdays', () => {
            mockCalculationService.startDate = new Date(2024, 0, 1);
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(1, headerDayRank);

            expect(drawBaseBorderSpy).toHaveBeenCalled();
        });

        it('should draw weekend background with fillRectangle', () => {
            mockCalculationService.startDate = new Date(2024, 0, 6);
            const headerDayRank: CalendarHeaderDayRank[] = [];

            service.drawDayBackgrounds(1, headerDayRank);

            expect(fillRectSpy).toHaveBeenCalled();
        });
    });

    describe('isCanvasAvailable', () => {
        it('should delegate to ganttCanvasManager', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(true);

            expect(service.isCanvasAvailable()).toBe(true);
        });

        it('should return false when canvas not available', () => {
            mockGanttCanvasManager.isCanvasAvailable.mockReturnValue(false);

            expect(service.isCanvasAvailable()).toBe(false);
        });
    });
});
