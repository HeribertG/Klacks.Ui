/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { GanttCanvasManagerService } from './gantt-canvas-manager.service';
import { CalendarSettingService } from './calendar-setting.service';

const createMockContext = (): CanvasRenderingContext2D => {
    return {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 10 }),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        transform: vi.fn(),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({
            addColorStop: vi.fn()
        }),
        createRadialGradient: vi.fn().mockReturnValue({
            addColorStop: vi.fn()
        }),
        createPattern: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
            data: new Uint8ClampedArray(4),
            width: 1,
            height: 1
        }),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        setLineDash: vi.fn(),
        getLineDash: vi.fn().mockReturnValue([]),
        canvas: {} as HTMLCanvasElement,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10,
        lineDashOffset: 0,
        shadowBlur: 0,
        shadowColor: 'rgba(0, 0, 0, 0)',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        direction: 'ltr',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'low',
    } as unknown as CanvasRenderingContext2D;
};

vi.mock('src/app/presentation/helpers/draw-helper', async (importOriginal) => {
    const actual = await importOriginal<typeof import('src/app/presentation/helpers/draw-helper')>();
    return {
        ...actual,
        DrawHelper: {
            ...actual.DrawHelper,
            createHiDPICanvas: (canvas: HTMLCanvasElement, w: number, h: number, setPixelRatio: boolean) => {
                if (setPixelRatio) {
                    const dpr = 2;
                    canvas.width = w * dpr;
                    canvas.height = h * dpr;
                }
                return createMockContext();
            },
            setAntiAliasing: vi.fn(),
            pixelRatio: () => 2,
        },
    };
});

describe('GanttCanvasManagerService', () => {
    let service: GanttCanvasManagerService;
    let mockCalendarSetting: any;
    let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

    beforeAll(() => {
        originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = vi.fn(function(this: HTMLCanvasElement) {
            return createMockContext();
        }) as any;
    });

    afterAll(() => {
        HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    beforeEach(() => {
        mockCalendarSetting = {
            cellWidth: 10,
            cellHeight: 30,
            cellHeaderHeight: 50
        };

        TestBed.configureTestingModule({
            providers: [
                GanttCanvasManagerService,
                { provide: CalendarSettingService, useValue: mockCalendarSetting },
            ],
        });

        service = TestBed.inject(GanttCanvasManagerService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('createCanvas', () => {
        it('should create all canvas elements', () => {
            // Arrange
            const mockMainCanvas = document.createElement('canvas');
            mockMainCanvas.id = 'absence-surface-canvas';
            document.body.appendChild(mockMainCanvas);

            // Act
            service.createCanvas();

            // Assert
            expect(service.canvas).toBe(mockMainCanvas);
            expect(service.ctx).toBeTruthy();
            expect(service.renderCanvas).toBeTruthy();
            expect(service.renderCanvasCtx).toBeTruthy();
            expect(service.headerCanvas).toBeTruthy();
            expect(service.headerCtx).toBeTruthy();
            expect(service.backgroundRowCanvas).toBeTruthy();
            expect(service.backgroundRowCtx).toBeTruthy();
            expect(service.rowCanvas).toBeTruthy();
            expect(service.rowCtx).toBeTruthy();

            document.body.removeChild(mockMainCanvas);
        });
    });

    describe('deleteCanvas', () => {
        it('should set all canvas references to undefined', () => {
            // Arrange
            service.canvas = document.createElement('canvas');
            service.ctx = createMockContext();
            service.renderCanvas = document.createElement('canvas');
            service.renderCanvasCtx = createMockContext();

            // Act
            service.deleteCanvas();

            // Assert
            expect(service.ctx).toBeUndefined();
            expect(service.canvas).toBeUndefined();
            expect(service.renderCanvasCtx).toBeUndefined();
            expect(service.renderCanvas).toBeUndefined();
            expect(service.headerCanvas).toBeUndefined();
            expect(service.headerCtx).toBeUndefined();
            expect(service.backgroundRowCanvas).toBeUndefined();
            expect(service.backgroundRowCtx).toBeUndefined();
            expect(service.rowCanvas).toBeUndefined();
            expect(service.rowCtx).toBeUndefined();
        });
    });

    describe('resizeMainCanvas with HiDPI', () => {
        it('should resize main canvas and update context', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.canvas = mockCanvas;
            service.ctx = createMockContext();
            service['_width'] = 100;
            service['_height'] = 200;

            // Act
            service.resizeMainCanvas();

            // Assert
            expect(service.ctx).toBeTruthy();
            expect(mockCanvas.width).toBeGreaterThan(0);
            expect(mockCanvas.height).toBeGreaterThan(0);
        });

        it('should update ctx after resize', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.canvas = mockCanvas;
            service.ctx = createMockContext();

            // Act
            service.resizeMainCanvas();

            // Assert
            expect(service.ctx).toBeTruthy();
        });
    });

    describe('resizeHeaderCanvas with HiDPI', () => {
        it('should resize header canvas and update context', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.headerCanvas = mockCanvas;
            service.headerCtx = createMockContext();

            // Act
            service.resizeHeaderCanvas(600);

            // Assert
            expect(service.headerCtx).toBeTruthy();
            expect(mockCanvas.width).toBeGreaterThan(0);
            expect(mockCanvas.height).toBeGreaterThan(0);
        });

        it('should update headerCtx after resize', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.headerCanvas = mockCanvas;
            service.headerCtx = createMockContext();

            // Act
            service.resizeHeaderCanvas(500);

            // Assert
            expect(service.headerCtx).toBeTruthy();
        });
    });

    describe('resizeRenderCanvas without HiDPI', () => {
        it('should NOT use HiDPI for render canvas', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            const mockCtx = createMockContext();
            service.renderCanvas = mockCanvas;
            service.renderCanvasCtx = mockCtx;

            const visibleRow = 10;
            const visibleCol = 20;

            // Act
            service.resizeRenderCanvas(visibleRow, visibleCol);

            // Assert
            expect(mockCanvas.height).toBe(visibleRow * mockCalendarSetting.cellHeight);
            expect(mockCanvas.width).toBe(visibleCol * mockCalendarSetting.cellWidth);
            expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
        });

        it('should use direct dimension assignment for intermediate buffer', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.renderCanvas = mockCanvas;
            service.renderCanvasCtx = createMockContext();

            // Act
            service.resizeRenderCanvas(5, 10);

            // Assert
            expect(mockCanvas.width).toBe(100);
            expect(mockCanvas.height).toBe(150);
        });
    });

    describe('resizeBackgroundRowCanvas without HiDPI', () => {
        it('should NOT use HiDPI for backgroundRow canvas', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.backgroundRowCanvas = mockCanvas;
            service.backgroundRowCtx = createMockContext();

            // Act
            service.resizeBackgroundRowCanvas(300);

            // Assert
            expect(mockCanvas.width).toBe(300);
            expect(mockCanvas.height).toBe(mockCalendarSetting.cellHeight);
        });

        it('should use direct dimension assignment', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.backgroundRowCanvas = mockCanvas;
            service.backgroundRowCtx = createMockContext();

            // Act
            service.resizeBackgroundRowCanvas(400);

            // Assert
            expect(mockCanvas.width).toBe(400);
            expect(mockCanvas.height).toBe(30);
        });
    });

    describe('resizeRowCanvas without HiDPI', () => {
        it('should NOT use HiDPI for row canvas', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.rowCanvas = mockCanvas;
            service.rowCtx = createMockContext();

            // Act
            service.resizeRowCanvas(250);

            // Assert
            expect(mockCanvas.width).toBe(250);
            expect(mockCanvas.height).toBe(mockCalendarSetting.cellHeight);
        });

        it('should use direct dimension assignment', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.rowCanvas = mockCanvas;
            service.rowCtx = createMockContext();

            // Act
            service.resizeRowCanvas(350);

            // Assert
            expect(mockCanvas.width).toBe(350);
            expect(mockCanvas.height).toBe(30);
        });
    });

    describe('isCanvasAvailable', () => {
        it('should return true when canvas is available', () => {
            // Arrange
            service.canvas = document.createElement('canvas');
            service.ctx = createMockContext();
            service['_width'] = 100;
            service['_height'] = 100;

            // Act & Assert
            expect(service.isCanvasAvailable()).toBe(true);
        });

        it('should return false when canvas is null', () => {
            // Arrange
            service.canvas = undefined;
            service.ctx = undefined;

            // Act & Assert
            expect(service.isCanvasAvailable()).toBe(false);
        });

        it('should return false when width is 0', () => {
            // Arrange
            service.canvas = document.createElement('canvas');
            service.ctx = createMockContext();
            service['_width'] = 0;
            service['_height'] = 100;

            // Act & Assert
            expect(service.isCanvasAvailable()).toBe(false);
        });

        it('should return false when height is 0', () => {
            // Arrange
            service.canvas = document.createElement('canvas');
            service.ctx = createMockContext();
            service['_width'] = 100;
            service['_height'] = 0;

            // Act & Assert
            expect(service.isCanvasAvailable()).toBe(false);
        });

        it('should return false when ctx is null', () => {
            // Arrange
            service.canvas = document.createElement('canvas');
            service.ctx = undefined;
            service['_width'] = 100;
            service['_height'] = 100;

            // Act & Assert
            expect(service.isCanvasAvailable()).toBe(false);
        });
    });

    describe('width and height setters', () => {
        it('should trigger resizeMainCanvas when width is set', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.canvas = mockCanvas;
            service.ctx = createMockContext();

            vi.spyOn(service, 'resizeMainCanvas');

            // Act
            service.width = 150;

            // Assert
            expect(service.resizeMainCanvas).toHaveBeenCalled();
        });

        it('should trigger resizeMainCanvas when height is set', () => {
            // Arrange
            const mockCanvas = document.createElement('canvas');
            service.canvas = mockCanvas;
            service.ctx = createMockContext();

            vi.spyOn(service, 'resizeMainCanvas');

            // Act
            service.height = 250;

            // Assert
            expect(service.resizeMainCanvas).toHaveBeenCalled();
        });
    });

    describe('HiDPI Architecture', () => {
        it('should apply HiDPI scaling to main canvas', () => {
            // Arrange
            const mockMainCanvas = document.createElement('canvas');
            mockMainCanvas.id = 'absence-surface-canvas';
            document.body.appendChild(mockMainCanvas);

            // Act
            service.createCanvas();

            // Assert
            expect(service.canvas!.width).toBeGreaterThan(0);
            expect(service.headerCanvas!.width).toBeGreaterThan(0);

            document.body.removeChild(mockMainCanvas);
        });

        it('should keep intermediate buffers without HiDPI scaling', () => {
            // Arrange
            const mockMainCanvas = document.createElement('canvas');
            mockMainCanvas.id = 'absence-surface-canvas';
            document.body.appendChild(mockMainCanvas);

            // Act
            service.createCanvas();

            // Assert
            expect(service.renderCanvas).toBeTruthy();
            expect(service.backgroundRowCanvas).toBeTruthy();
            expect(service.rowCanvas).toBeTruthy();

            document.body.removeChild(mockMainCanvas);
        });
    });
});
