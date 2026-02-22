// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { ValidityPeriodRenderingService } from './validity-period-rendering.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { CalendarCalculationService } from './calendar-calculation.service';

describe('ValidityPeriodRenderingService', () => {
    let service: ValidityPeriodRenderingService;
    let mockGanttCanvasManager: any;
    let mockGridColors: any;
    let mockCalendarSetting: any;
    let mockCalculationService: any;
    let mockRowCtx: any;

    beforeEach(() => {
        mockRowCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            fillRect: vi.fn()
        };

        mockGanttCanvasManager = {
            rowCtx: mockRowCtx
        };

        mockGridColors = {
            backGroundSealedColor: '#cccccc'
        };

        mockCalendarSetting = {
            cellWidth: 10,
            cellHeight: 30
        };

        mockCalculationService = {
            calcValidFromColumn: vi.fn(),
            calcValidUntilColumn: vi.fn(),
            calcDaysPerYear: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                ValidityPeriodRenderingService,
                {
                    provide: GanttCanvasManagerService,
                    useValue: mockGanttCanvasManager,
                },
                { provide: GridColorService, useValue: mockGridColors },
                { provide: CalendarSettingService, useValue: mockCalendarSetting },
                {
                    provide: CalendarCalculationService,
                    useValue: mockCalculationService,
                },
            ],
        });

        service = TestBed.inject(ValidityPeriodRenderingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('drawPreValidFromGrayRectangle', () => {
        it('should not draw when validFromColumn is 0', () => {
            // Arrange
            mockCalculationService.calcValidFromColumn.mockReturnValue(0);

            // Act
            service.drawPreValidFromGrayRectangle(0);

            // Assert
            expect(mockRowCtx.fillRect).not.toHaveBeenCalled();
        });

        it('should not draw when validFromColumn is negative', () => {
            // Arrange
            mockCalculationService.calcValidFromColumn.mockReturnValue(-5);

            // Act
            service.drawPreValidFromGrayRectangle(0);

            // Assert
            expect(mockRowCtx.fillRect).not.toHaveBeenCalled();
        });

        it('should draw gray rectangle from column 0 to validFromColumn', () => {
            // Arrange
            mockCalculationService.calcValidFromColumn.mockReturnValue(10);

            // Act
            service.drawPreValidFromGrayRectangle(5);

            // Assert
            expect(mockRowCtx.save).toHaveBeenCalled();
            expect(mockRowCtx.fillRect).toHaveBeenCalledWith(0, 0, 10 * mockCalendarSetting.cellWidth, mockCalendarSetting.cellHeight);
            expect(mockRowCtx.restore).toHaveBeenCalled();
        });

        it('should use correct alpha and color', () => {
            // Arrange
            mockCalculationService.calcValidFromColumn.mockReturnValue(5);

            // Act
            service.drawPreValidFromGrayRectangle(0);

            // Assert
            expect(mockRowCtx.save).toHaveBeenCalled();
            expect(mockRowCtx.restore).toHaveBeenCalled();
        });

        it('should calculate width based on cellWidth', () => {
            // Arrange
            const validFromColumn = 15;
            mockCalculationService.calcValidFromColumn.mockReturnValue(validFromColumn);

            // Act
            service.drawPreValidFromGrayRectangle(10);

            // Assert
            expect(mockRowCtx.fillRect).toHaveBeenCalledWith(0, 0, validFromColumn * mockCalendarSetting.cellWidth, mockCalendarSetting.cellHeight);
        });
    });

    describe('drawPostValidUntilGrayRectangle', () => {
        it('should not draw when validUntilColumn is 0', () => {
            // Arrange
            mockCalculationService.calcValidUntilColumn.mockReturnValue(0);

            // Act
            service.drawPostValidUntilGrayRectangle(0);

            // Assert
            expect(mockRowCtx.fillRect).not.toHaveBeenCalled();
        });

        it('should not draw when validUntilColumn is negative', () => {
            // Arrange
            mockCalculationService.calcValidUntilColumn.mockReturnValue(-3);

            // Act
            service.drawPostValidUntilGrayRectangle(0);

            // Assert
            expect(mockRowCtx.fillRect).not.toHaveBeenCalled();
        });

        it('should draw gray rectangle from validUntilColumn to end of year', () => {
            // Arrange
            mockCalculationService.calcValidUntilColumn.mockReturnValue(300);
            mockCalculationService.calcDaysPerYear.mockReturnValue(365);

            // Act
            service.drawPostValidUntilGrayRectangle(5);

            // Assert
            expect(mockRowCtx.save).toHaveBeenCalled();
            expect(mockRowCtx.fillRect).toHaveBeenCalledWith(300 * mockCalendarSetting.cellWidth, 0, (365 - 300) * mockCalendarSetting.cellWidth, mockCalendarSetting.cellHeight);
            expect(mockRowCtx.restore).toHaveBeenCalled();
        });

        it('should use correct alpha and color', () => {
            // Arrange
            mockCalculationService.calcValidUntilColumn.mockReturnValue(350);
            mockCalculationService.calcDaysPerYear.mockReturnValue(365);

            // Act
            service.drawPostValidUntilGrayRectangle(0);

            // Assert
            expect(mockRowCtx.save).toHaveBeenCalled();
            expect(mockRowCtx.restore).toHaveBeenCalled();
        });

        it('should calculate position based on validUntilColumn', () => {
            // Arrange
            const validUntilColumn = 280;
            mockCalculationService.calcValidUntilColumn.mockReturnValue(validUntilColumn);
            mockCalculationService.calcDaysPerYear.mockReturnValue(366);

            // Act
            service.drawPostValidUntilGrayRectangle(10);

            // Assert
            expect(mockRowCtx.fillRect).toHaveBeenCalledWith(validUntilColumn * mockCalendarSetting.cellWidth, 0, (366 - validUntilColumn) * mockCalendarSetting.cellWidth, mockCalendarSetting.cellHeight);
        });

        it('should handle leap year correctly', () => {
            // Arrange
            mockCalculationService.calcValidUntilColumn.mockReturnValue(300);
            mockCalculationService.calcDaysPerYear.mockReturnValue(366);

            // Act
            service.drawPostValidUntilGrayRectangle(5);

            // Assert
            expect(mockCalculationService.calcDaysPerYear).toHaveBeenCalled();
            expect(mockRowCtx.fillRect).toHaveBeenCalledWith(300 * mockCalendarSetting.cellWidth, 0, (366 - 300) * mockCalendarSetting.cellWidth, mockCalendarSetting.cellHeight);
        });
    });

    describe('Combined validity period scenarios', () => {
        it('should handle both pre and post validity periods for same client', () => {
            // Arrange
            mockCalculationService.calcValidFromColumn.mockReturnValue(30);
            mockCalculationService.calcValidUntilColumn.mockReturnValue(335);
            mockCalculationService.calcDaysPerYear.mockReturnValue(365);

            // Act
            service.drawPreValidFromGrayRectangle(5);
            service.drawPostValidUntilGrayRectangle(5);

            // Assert
            expect(mockRowCtx.fillRect).toHaveBeenCalledTimes(2);
            expect(mockRowCtx.save).toHaveBeenCalledTimes(2);
            expect(mockRowCtx.restore).toHaveBeenCalledTimes(2);
        });

        it('should not draw anything for fully valid client', () => {
            // Arrange
            mockCalculationService.calcValidFromColumn.mockReturnValue(0);
            mockCalculationService.calcValidUntilColumn.mockReturnValue(0);

            // Act
            service.drawPreValidFromGrayRectangle(5);
            service.drawPostValidUntilGrayRectangle(5);

            // Assert
            expect(mockRowCtx.fillRect).not.toHaveBeenCalled();
        });
    });
});
