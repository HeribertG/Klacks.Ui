// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { BreakRenderingService } from './break-rendering.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { BreakLayerService } from '../break-layer.service';
import { CalendarCalculationService } from './calendar-calculation.service';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { signal } from '@angular/core';
import * as DrawHelperModule from 'src/app/presentation/helpers/draw-helper';

describe('BreakRenderingService', () => {
    let service: BreakRenderingService;
    let mockGanttCanvasManager: any;
    let mockDataManagementBreak: any;
    let mockDataManagementAbsence: any;
    let mockBreakLayerService: any;
    let mockCalculationService: any;
    let mockRowCtx: any;
    let mockCtx: any;

    beforeEach(() => {
        mockRowCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            globalAlpha: 1.0,
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            strokeRect: vi.fn()
        };

        mockCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn()
        };

        mockGanttCanvasManager = {
            isCanvasAvailable: vi.fn().mockReturnValue(true),
            rowCtx: mockRowCtx,
            ctx: mockCtx
        };

        mockDataManagementBreak = {
            readData: vi.fn().mockReturnValue(null)
        };

        mockDataManagementAbsence = {
            absenceList: signal([
                { id: 'abs-1', color: '#ff0000', name: 'Vacation' },
                { id: 'abs-2', color: '#00ff00', name: 'Sick' }
            ])
        };

        mockBreakLayerService = {
            calculateOptimizedBreakLayers: vi.fn().mockReturnValue([]),
            calculateRecommendedRowHeight: vi.fn().mockReturnValue(45)
        };

        mockCalculationService = {
            calcDateRectangle: vi.fn().mockReturnValue(new Rectangle(0, 11, 80, 33)),
            calcLayeredRectangle: vi.fn().mockReturnValue(new Rectangle(0, 11, 80, 33)),
            calcLeftAnchorRectangle: vi.fn().mockReturnValue(new Rectangle(-10, 17, 0, 27)),
            calcRightAnchorRectangle: vi.fn().mockReturnValue(new Rectangle(80, 17, 90, 27))
        };

        TestBed.configureTestingModule({
            providers: [
                BreakRenderingService,
                { provide: GanttCanvasManagerService, useValue: mockGanttCanvasManager },
                { provide: DataManagementBreakPlaceholderService, useValue: mockDataManagementBreak },
                { provide: DataManagementAbsenceGanttService, useValue: mockDataManagementAbsence },
                { provide: BreakLayerService, useValue: mockBreakLayerService },
                { provide: CalendarCalculationService, useValue: mockCalculationService }
            ]
        });

        service = TestBed.inject(BreakRenderingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('drawRowBreaks', () => {
        it('should not draw when no breaks exist', () => {
            mockDataManagementBreak.readData.mockReturnValue(null);

            service.drawRowBreaks(0, undefined);

            expect(mockBreakLayerService.calculateOptimizedBreakLayers).not.toHaveBeenCalled();
        });

        it('should not draw when breaks array is empty', () => {
            mockDataManagementBreak.readData.mockReturnValue([]);

            service.drawRowBreaks(0, undefined);

            expect(mockBreakLayerService.calculateOptimizedBreakLayers).not.toHaveBeenCalled();
        });

        it('should calculate layers for valid breaks', () => {
            const breaks = [
                { id: '1', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5), absenceId: 'abs-1' }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateOptimizedBreakLayers.mockReturnValue([
                { ...breaks[0], layer: 0 }
            ]);

            service.drawRowBreaks(0, undefined);

            expect(mockBreakLayerService.calculateOptimizedBreakLayers).toHaveBeenCalled();
        });

        it('should skip selectedBreak matching by id', () => {
            const breaks = [
                { id: 'sel-1', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5), absenceId: 'abs-1' }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateOptimizedBreakLayers.mockReturnValue([
                { ...breaks[0], layer: 0 }
            ]);
            const selectedBreak = { id: 'sel-1' } as any;

            service.drawRowBreaks(0, selectedBreak);

            expect(mockCalculationService.calcDateRectangle).not.toHaveBeenCalled();
        });

        it('should draw break when it does not match selectedBreak', () => {
            const breaks = [
                { id: 'br-1', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5), absenceId: 'abs-1' }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateOptimizedBreakLayers.mockReturnValue([
                { ...breaks[0], layer: 0 }
            ]);
            const selectedBreak = { id: 'sel-other' } as any;

            service.drawRowBreaks(0, selectedBreak);

            expect(mockCalculationService.calcDateRectangle).toHaveBeenCalled();
        });

        it('should skip break when absence is not found', () => {
            const breaks = [
                { id: 'br-1', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5), absenceId: 'unknown-abs' }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateOptimizedBreakLayers.mockReturnValue([
                { ...breaks[0], layer: 0 }
            ]);

            service.drawRowBreaks(0, undefined);

            expect(mockRowCtx.save).not.toHaveBeenCalled();
        });

        it('should draw with full opacity for layer 0', () => {
            const breaks = [
                { id: 'br-1', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5), absenceId: 'abs-1' }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateOptimizedBreakLayers.mockReturnValue([
                { ...breaks[0], layer: 0 }
            ]);

            service.drawRowBreaks(0, undefined);

            expect(mockRowCtx.save).toHaveBeenCalled();
            expect(mockRowCtx.globalAlpha).toBe(1.0);
            expect(mockRowCtx.restore).toHaveBeenCalled();
        });

        it('should draw with reduced opacity for layer > 0', () => {
            const breaks = [
                { id: 'br-1', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5), absenceId: 'abs-1' }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateOptimizedBreakLayers.mockReturnValue([
                { ...breaks[0], layer: 1 }
            ]);

            service.drawRowBreaks(0, undefined);

            expect(mockRowCtx.globalAlpha).toBe(0.85);
            expect(mockRowCtx.strokeRect).toHaveBeenCalled();
        });

        it('should filter out invalid breaks', () => {
            const breaks = [
                { id: '1', from: null, until: new Date(2024, 0, 5), absenceId: 'abs-1' },
                { id: '2', from: new Date(2024, 0, 1), until: null, absenceId: 'abs-1' },
                null,
                { id: '3', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5), absenceId: 'abs-1' }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateOptimizedBreakLayers.mockReturnValue([
                { ...breaks[3], layer: 0 }
            ]);

            service.drawRowBreaks(0, undefined);

            expect(mockBreakLayerService.calculateOptimizedBreakLayers).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ id: '3' })])
            );
        });

        it('should handle error in single break without crashing', () => {
            const breaks = [
                { id: 'br-1', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5), absenceId: 'abs-1' },
                { id: 'br-2', from: new Date(2024, 0, 10), until: new Date(2024, 0, 15), absenceId: 'abs-1' }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateOptimizedBreakLayers.mockReturnValue([
                { ...breaks[0], layer: 0 },
                { ...breaks[1], layer: 0 }
            ]);
            mockCalculationService.calcDateRectangle
                .mockImplementationOnce(() => { throw new Error('test error'); })
                .mockReturnValueOnce(new Rectangle(80, 11, 160, 33));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            service.drawRowBreaks(0, undefined);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should draw multiple breaks', () => {
            const breaks = [
                { id: 'br-1', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5), absenceId: 'abs-1' },
                { id: 'br-2', from: new Date(2024, 0, 10), until: new Date(2024, 0, 15), absenceId: 'abs-2' }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateOptimizedBreakLayers.mockReturnValue([
                { ...breaks[0], layer: 0 },
                { ...breaks[1], layer: 0 }
            ]);

            service.drawRowBreaks(0, undefined);

            expect(mockCalculationService.calcDateRectangle).toHaveBeenCalledTimes(2);
            expect(mockCalculationService.calcLayeredRectangle).toHaveBeenCalledTimes(2);
        });
    });

    describe('getRecommendedRowHeight', () => {
        it('should return cellHeight when no breaks', () => {
            mockDataManagementBreak.readData.mockReturnValue(null);

            const result = service.getRecommendedRowHeight(0, 45);

            expect(result).toBe(45);
        });

        it('should return cellHeight when breaks are empty', () => {
            mockDataManagementBreak.readData.mockReturnValue([]);

            const result = service.getRecommendedRowHeight(0, 45);

            expect(result).toBe(45);
        });

        it('should delegate to breakLayerService for valid breaks', () => {
            const breaks = [
                { id: '1', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5) }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateRecommendedRowHeight.mockReturnValue(60);

            const result = service.getRecommendedRowHeight(0, 45);

            expect(result).toBe(60);
            expect(mockBreakLayerService.calculateRecommendedRowHeight).toHaveBeenCalled();
        });

        it('should filter invalid breaks before delegating', () => {
            const breaks = [
                { id: '1', from: null, until: new Date(2024, 0, 5) },
                { id: '2', from: new Date(2024, 0, 1), until: new Date(2024, 0, 5) }
            ];
            mockDataManagementBreak.readData.mockReturnValue(breaks);
            mockBreakLayerService.calculateRecommendedRowHeight.mockReturnValue(50);

            service.getRecommendedRowHeight(0, 45);

            const calledWith = mockBreakLayerService.calculateRecommendedRowHeight.mock.calls[0][0];
            expect(calledWith).toHaveLength(1);
            expect(calledWith[0].id).toBe('2');
        });
    });

    describe('drawBreakIntern', () => {
        it('should call DrawHelper.fillRectangle', () => {
            const fillSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'fillRectangle').mockImplementation(() => {});
            const rec = new Rectangle(0, 0, 100, 50);

            service.drawBreakIntern(rec, '#ff0000');

            expect(fillSpy).toHaveBeenCalledWith(mockCtx, '#ff0000', rec);
            fillSpy.mockRestore();
        });
    });

    describe('drawBreakSelectBorderIntern', () => {
        it('should call DrawHelper.drawSelectionBorder', () => {
            const borderSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'drawSelectionBorder').mockImplementation(() => {});
            const rec = new Rectangle(0, 0, 100, 50);

            service.drawBreakSelectBorderIntern(rec);

            expect(borderSpy).toHaveBeenCalledWith(mockCtx, rec);
            borderSpy.mockRestore();
        });
    });

    describe('drawBreakSelectBorderInternAnchor', () => {
        it('should call DrawHelper.drawAnchor for both anchors', () => {
            const anchorSpy = vi.spyOn(DrawHelperModule.DrawHelper, 'drawAnchor').mockImplementation(() => {});
            const rec = new Rectangle(0, 0, 100, 50);

            service.drawBreakSelectBorderInternAnchor(rec);

            expect(anchorSpy).toHaveBeenCalledTimes(2);
            expect(mockCalculationService.calcLeftAnchorRectangle).toHaveBeenCalledWith(rec);
            expect(mockCalculationService.calcRightAnchorRectangle).toHaveBeenCalledWith(rec);
            anchorSpy.mockRestore();
        });
    });
});
