// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { CalendarHeaderRenderingService } from './calendar-header-rendering.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { GridFontsService } from '../../../../shared/grid/services/grid-fonts.service';
import { CalendarHeaderDayRank } from 'src/app/domain/models/absence/absence-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import * as DrawHelperModule from 'src/app/presentation/helpers/draw-helper';

describe('CalendarHeaderRenderingService', () => {
    let service: CalendarHeaderRenderingService;
    let mockGanttCanvasManager: any;
    let mockGridColors: any;
    let mockCalendarSetting: any;
    let mockGridFonts: any;
    let mockHeaderCtx: any;

    beforeEach(() => {
        mockHeaderCtx = {
            drawImage: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            fillRect: vi.fn()
        };

        mockGanttCanvasManager = {
            isCanvasAvailable: vi.fn().mockReturnValue(true),
            headerCtx: mockHeaderCtx,
            backgroundRowCanvas: { width: 800, height: 45 }
        };

        mockGridColors = {
            foreGroundColor: '#000000'
        };

        mockCalendarSetting = {
            cellWidth: 8,
            cellHeight: 45,
            cellHeaderHeight: 55
        };

        mockGridFonts = {
            firstSubFontName: 'Arial',
            firstSubFontSize: '10'
        };

        TestBed.configureTestingModule({
            providers: [
                CalendarHeaderRenderingService,
                { provide: GanttCanvasManagerService, useValue: mockGanttCanvasManager },
                { provide: GridColorService, useValue: mockGridColors },
                { provide: CalendarSettingService, useValue: mockCalendarSetting },
                { provide: GridFontsService, useValue: mockGridFonts }
            ]
        });

        service = TestBed.inject(CalendarHeaderRenderingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('copyRulerOnHeadline', () => {
        it('should copy backgroundRowCanvas to headerCanvas', () => {
            service.copyRulerOnHeadline();

            expect(mockHeaderCtx.drawImage).toHaveBeenCalledWith(
                mockGanttCanvasManager.backgroundRowCanvas,
                0,
                mockCalendarSetting.cellHeight
            );
        });
    });

    describe('drawWeekendDayNumberOnHeadline', () => {
        it('should draw day numbers when cellWidth is large enough', () => {
            mockCalendarSetting.cellWidth = 11;
            const fillSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'fillRectangle').mockImplementation(() => {});
            const textSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'drawText').mockImplementation(() => {});

            const headerDayRank: CalendarHeaderDayRank[] = [
                createHeaderDayRank('6', '#fff0e0', new Rectangle(48, 45, 68, 55)),
                createHeaderDayRank('7', '#ffe0e0', new Rectangle(56, 45, 76, 55))
            ];

            service.drawWeekendDayNumberOnHeadline(headerDayRank);

            expect(fillSpy).toHaveBeenCalledTimes(2);
            expect(textSpy).toHaveBeenCalledTimes(2);
            fillSpy.mockRestore();
            textSpy.mockRestore();
        });

        it('should not draw when cellWidth is too small', () => {
            mockCalendarSetting.cellWidth = 5;
            const fillSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'fillRectangle').mockImplementation(() => {});

            const headerDayRank: CalendarHeaderDayRank[] = [
                createHeaderDayRank('6', '#fff0e0', new Rectangle(40, 45, 60, 55))
            ];

            service.drawWeekendDayNumberOnHeadline(headerDayRank);

            expect(fillSpy).not.toHaveBeenCalled();
            fillSpy.mockRestore();
        });

        it('should not draw for empty array', () => {
            mockCalendarSetting.cellWidth = 11;
            const fillSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'fillRectangle').mockImplementation(() => {});

            service.drawWeekendDayNumberOnHeadline([]);

            expect(fillSpy).not.toHaveBeenCalled();
            fillSpy.mockRestore();
        });

        it('should skip when headerCtx is null', () => {
            mockCalendarSetting.cellWidth = 11;
            mockGanttCanvasManager.headerCtx = null;
            const fillSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'fillRectangle').mockImplementation(() => {});

            const headerDayRank: CalendarHeaderDayRank[] = [
                createHeaderDayRank('6', '#fff0e0', new Rectangle(48, 45, 68, 55))
            ];

            service.drawWeekendDayNumberOnHeadline(headerDayRank);

            expect(fillSpy).not.toHaveBeenCalled();
            fillSpy.mockRestore();
        });

        it('should use correct threshold (cellWidth * 2 >= 20)', () => {
            mockCalendarSetting.cellWidth = 10;
            const fillSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'fillRectangle').mockImplementation(() => {});
            const textSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'drawText').mockImplementation(() => {});

            const headerDayRank: CalendarHeaderDayRank[] = [
                createHeaderDayRank('1', '#ffe0e0', new Rectangle(0, 45, 20, 55))
            ];

            service.drawWeekendDayNumberOnHeadline(headerDayRank);

            expect(fillSpy).toHaveBeenCalledTimes(1);
            fillSpy.mockRestore();
            textSpy.mockRestore();
        });

        it('should not draw at threshold boundary (cellWidth * 2 < 20)', () => {
            mockCalendarSetting.cellWidth = 9;
            const fillSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'fillRectangle').mockImplementation(() => {});

            const headerDayRank: CalendarHeaderDayRank[] = [
                createHeaderDayRank('1', '#ffe0e0', new Rectangle(0, 45, 18, 55))
            ];

            service.drawWeekendDayNumberOnHeadline(headerDayRank);

            expect(fillSpy).not.toHaveBeenCalled();
            fillSpy.mockRestore();
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

function createHeaderDayRank(name: string, backColor: string, rect: Rectangle): CalendarHeaderDayRank {
    const rank = new CalendarHeaderDayRank();
    rank.name = name;
    rank.backColor = backColor;
    rank.rect = rect;
    return rank;
}
