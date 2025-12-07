/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { DrawCalendarGanttService } from './draw-calendar-gantt.service';
import { GanttCanvasManagerService } from './gantt-canvas-manager.service';
import { RenderCalendarGridService } from './render-calendar-grid';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { HolidayCollectionService } from '../../../shared/grid/services/holiday-collection.service';
import { CalendarSettingService } from './calendar-setting.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/absence/data-management-break-placeholder.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { ScrollService } from '../../../shared/scrollbar/scroll.service';

describe('DrawCalendarGanttService', () => {
    let service: DrawCalendarGanttService;

    beforeEach(() => {
        const mockGanttCanvasManager = {
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

        const mockRenderCalendarGrid = {
            selectedRow: 0,
            selectedBreakIndex: -1,
            selectedBreakRec: undefined,
            selectedBreak: undefined,
            startDate: new Date(),
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
            checkSelectedRowVisibility: vi.fn()
        };

        const mockGridColors = {
            focusBorderColor: '#000000'
        };

        const mockHolidayCollection = {
            currentYear: 2024
        };

        const mockCalendarSetting = {
            cellWidth: 20,
            cellHeight: 25,
            cellHeaderHeight: 50
        };

        const mockDataManagementBreak = {
            rows: 10,
            readData: vi.fn().mockReturnValue([])
        };

        const mockDataManagementAbsence = {};

        const mockScrollService = {
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
                { provide: DataManagementAbsenceGanttService, useValue: mockDataManagementAbsence },
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
            // Assert
            expect(service.vScrollbarRefreshTrigger).toBeDefined();
            expect(typeof service.vScrollbarRefreshTrigger).toBe('function');
            expect(service.vScrollbarRefreshTrigger()).toBe(0);
        });

        it('should have hScrollbarRefreshTrigger signal initialized to 0', () => {
            // Assert
            expect(service.hScrollbarRefreshTrigger).toBeDefined();
            expect(typeof service.hScrollbarRefreshTrigger).toBe('function');
            expect(service.hScrollbarRefreshTrigger()).toBe(0);
        });
    });

    describe('vScrollbarRefreshTrigger', () => {
        it('should increment when update is called', () => {
            // Arrange
            const initialValue = service.vScrollbarRefreshTrigger();

            // Act
            service.vScrollbarRefreshTrigger.update(v => v + 1);

            // Assert
            expect(service.vScrollbarRefreshTrigger()).toBe(initialValue + 1);
        });

        it('should increment multiple times', () => {
            // Arrange
            const initialValue = service.vScrollbarRefreshTrigger();

            // Act
            service.vScrollbarRefreshTrigger.update(v => v + 1);
            service.vScrollbarRefreshTrigger.update(v => v + 1);
            service.vScrollbarRefreshTrigger.update(v => v + 1);

            // Assert
            expect(service.vScrollbarRefreshTrigger()).toBe(initialValue + 3);
        });
    });

    describe('hScrollbarRefreshTrigger', () => {
        it('should increment when update is called', () => {
            // Arrange
            const initialValue = service.hScrollbarRefreshTrigger();

            // Act
            service.hScrollbarRefreshTrigger.update(v => v + 1);

            // Assert
            expect(service.hScrollbarRefreshTrigger()).toBe(initialValue + 1);
        });

        it('should increment multiple times', () => {
            // Arrange
            const initialValue = service.hScrollbarRefreshTrigger();

            // Act
            service.hScrollbarRefreshTrigger.update(v => v + 1);
            service.hScrollbarRefreshTrigger.update(v => v + 1);
            service.hScrollbarRefreshTrigger.update(v => v + 1);

            // Assert
            expect(service.hScrollbarRefreshTrigger()).toBe(initialValue + 3);
        });
    });

    describe('setMetrics', () => {
        it('should increment vScrollbarRefreshTrigger', () => {
            // Arrange
            const ganttCanvasManager = TestBed.inject(GanttCanvasManagerService) as any;
            ganttCanvasManager.isCanvasAvailable.mockReturnValue(true);
            const initialValue = service.vScrollbarRefreshTrigger();

            // Act
            service.setMetrics();

            // Assert
            expect(service.vScrollbarRefreshTrigger()).toBe(initialValue + 1);
        });

        it('should increment hScrollbarRefreshTrigger', () => {
            // Arrange
            const ganttCanvasManager = TestBed.inject(GanttCanvasManagerService) as any;
            ganttCanvasManager.isCanvasAvailable.mockReturnValue(true);
            const initialValue = service.hScrollbarRefreshTrigger();

            // Act
            service.setMetrics();

            // Assert
            expect(service.hScrollbarRefreshTrigger()).toBe(initialValue + 1);
        });

        it('should increment both triggers simultaneously', () => {
            // Arrange
            const ganttCanvasManager = TestBed.inject(GanttCanvasManagerService) as any;
            ganttCanvasManager.isCanvasAvailable.mockReturnValue(true);
            const initialVValue = service.vScrollbarRefreshTrigger();
            const initialHValue = service.hScrollbarRefreshTrigger();

            // Act
            service.setMetrics();

            // Assert
            expect(service.vScrollbarRefreshTrigger()).toBe(initialVValue + 1);
            expect(service.hScrollbarRefreshTrigger()).toBe(initialHValue + 1);
        });
    });

    describe('Trigger signal pattern', () => {
        it('should allow consumers to react to vScrollbarRefreshTrigger changes', () => {
            // Arrange
            const ganttCanvasManager = TestBed.inject(GanttCanvasManagerService) as any;
            ganttCanvasManager.isCanvasAvailable.mockReturnValue(true);
            let callCount = 0;
            const initialValue = service.vScrollbarRefreshTrigger();

            // Act
            service.setMetrics();
            if (service.vScrollbarRefreshTrigger() !== initialValue) {
                callCount++;
            }

            // Assert
            expect(callCount).toBe(1);
        });

        it('should allow consumers to react to hScrollbarRefreshTrigger changes', () => {
            // Arrange
            const ganttCanvasManager = TestBed.inject(GanttCanvasManagerService) as any;
            ganttCanvasManager.isCanvasAvailable.mockReturnValue(true);
            let callCount = 0;
            const initialValue = service.hScrollbarRefreshTrigger();

            // Act
            service.setMetrics();
            if (service.hScrollbarRefreshTrigger() !== initialValue) {
                callCount++;
            }

            // Assert
            expect(callCount).toBe(1);
        });
    });
});
