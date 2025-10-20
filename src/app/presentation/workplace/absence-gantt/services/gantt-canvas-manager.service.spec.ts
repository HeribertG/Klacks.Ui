import { TestBed } from '@angular/core/testing';
import { GanttCanvasManagerService } from './gantt-canvas-manager.service';
import { CalendarSettingService } from './calendar-setting.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';

describe('GanttCanvasManagerService', () => {
  let service: GanttCanvasManagerService;
  let mockCalendarSetting: jasmine.SpyObj<CalendarSettingService>;

  beforeEach(() => {
    mockCalendarSetting = jasmine.createSpyObj('CalendarSettingService', [], {
      cellWidth: 10,
      cellHeight: 30,
      cellHeaderHeight: 50,
    });

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
      const mockMainCanvas = document.createElement('canvas');
      mockMainCanvas.id = 'calendarCanvas';
      document.body.appendChild(mockMainCanvas);

      spyOn(DrawHelper, 'createHiDPICanvas').and.returnValue(
        mockMainCanvas.getContext('2d')!
      );
      spyOn(DrawHelper, 'setAntiAliasing');

      service.createCanvas();

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
      service.canvas = document.createElement('canvas');
      service.ctx = service.canvas.getContext('2d')!;
      service.renderCanvas = document.createElement('canvas');
      service.renderCanvasCtx = service.renderCanvas.getContext('2d')!;

      service.deleteCanvas();

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
    it('should use createHiDPICanvas with setPixelRatio=true for main canvas', () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      service.canvas = mockCanvas;
      service.ctx = mockCtx;

      spyOn(DrawHelper, 'createHiDPICanvas').and.returnValue(mockCtx);
      spyOn(DrawHelper, 'setAntiAliasing');

      service.resizeMainCanvas();

      expect(DrawHelper.createHiDPICanvas).toHaveBeenCalledWith(
        mockCanvas,
        service.width,
        service.height,
        true
      );
      expect(DrawHelper.setAntiAliasing).toHaveBeenCalledWith(mockCtx);
    });

    it('should apply HiDPI scaling based on devicePixelRatio', () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      service.canvas = mockCanvas;
      service.ctx = mockCtx;

      const pixelRatioSpy = spyOn(DrawHelper, 'pixelRatio').and.returnValue(2);
      spyOn(mockCtx, 'scale');

      const createHiDPISpy = spyOn(DrawHelper, 'createHiDPICanvas').and.callFake(
        (canvas, w, h, setPixelRatio) => {
          if (setPixelRatio) {
            const dpr = DrawHelper.pixelRatio();
            canvas.width = w * dpr;
            canvas.height = h * dpr;
          }
          return mockCtx;
        }
      );

      service.width = 100;
      service.height = 200;

      expect(pixelRatioSpy).toHaveBeenCalled();
      expect(createHiDPISpy).toHaveBeenCalledWith(mockCanvas, 100, 200, true);
      expect(mockCanvas.width).toBe(200);
      expect(mockCanvas.height).toBe(400);
    });
  });

  describe('resizeHeaderCanvas with HiDPI', () => {
    it('should use createHiDPICanvas with setPixelRatio=true for header canvas', () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      service.headerCanvas = mockCanvas;
      service.headerCtx = mockCtx;

      spyOn(DrawHelper, 'createHiDPICanvas').and.returnValue(mockCtx);
      spyOn(DrawHelper, 'setAntiAliasing');

      service.resizeHeaderCanvas(500);

      expect(DrawHelper.createHiDPICanvas).toHaveBeenCalledWith(
        mockCanvas,
        500,
        mockCalendarSetting.cellHeaderHeight,
        true
      );
      expect(DrawHelper.setAntiAliasing).toHaveBeenCalledWith(mockCtx);
    });

    it('should apply HiDPI to header canvas for sharp text rendering', () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      service.headerCanvas = mockCanvas;
      service.headerCtx = mockCtx;

      const pixelRatioSpy = spyOn(DrawHelper, 'pixelRatio').and.returnValue(2);

      const createHiDPISpy = spyOn(DrawHelper, 'createHiDPICanvas').and.callFake(
        (canvas, w, h, setPixelRatio) => {
          if (setPixelRatio) {
            const dpr = DrawHelper.pixelRatio();
            canvas.width = w * dpr;
            canvas.height = h * dpr;
          }
          return mockCtx;
        }
      );

      service.resizeHeaderCanvas(600);

      expect(createHiDPISpy).toHaveBeenCalledWith(
        mockCanvas,
        600,
        mockCalendarSetting.cellHeaderHeight,
        true
      );
      expect(pixelRatioSpy).toHaveBeenCalled();
      expect(mockCanvas.width).toBe(1200);
      expect(mockCanvas.height).toBe(100);
    });
  });

  describe('resizeRenderCanvas without HiDPI', () => {
    it('should NOT use HiDPI for render canvas', () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      service.renderCanvas = mockCanvas;
      service.renderCanvasCtx = mockCtx;

      spyOn(mockCtx, 'clearRect');

      const visibleRow = 10;
      const visibleCol = 20;

      service.resizeRenderCanvas(visibleRow, visibleCol);

      expect(mockCanvas.height).toBe(visibleRow * mockCalendarSetting.cellHeight);
      expect(mockCanvas.width).toBe(visibleCol * mockCalendarSetting.cellWidth);
      expect(mockCtx.clearRect).toHaveBeenCalledWith(
        0,
        0,
        mockCanvas.width,
        mockCanvas.height
      );
    });

    it('should use direct dimension assignment for intermediate buffer', () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      service.renderCanvas = mockCanvas;
      service.renderCanvasCtx = mockCtx;

      spyOn(DrawHelper, 'createHiDPICanvas');

      service.resizeRenderCanvas(5, 10);

      expect(DrawHelper.createHiDPICanvas).not.toHaveBeenCalled();
    });
  });

  describe('resizeBackgroundRowCanvas without HiDPI', () => {
    it('should NOT use HiDPI for backgroundRow canvas', () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      service.backgroundRowCanvas = mockCanvas;
      service.backgroundRowCtx = mockCtx;

      service.resizeBackgroundRowCanvas(300);

      expect(mockCanvas.width).toBe(300);
      expect(mockCanvas.height).toBe(mockCalendarSetting.cellHeight);
    });

    it('should use direct dimension assignment', () => {
      const mockCanvas = document.createElement('canvas');
      service.backgroundRowCanvas = mockCanvas;
      service.backgroundRowCtx = mockCanvas.getContext('2d')!;

      spyOn(DrawHelper, 'createHiDPICanvas');

      service.resizeBackgroundRowCanvas(400);

      expect(DrawHelper.createHiDPICanvas).not.toHaveBeenCalled();
    });
  });

  describe('resizeRowCanvas without HiDPI', () => {
    it('should NOT use HiDPI for row canvas', () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;
      service.rowCanvas = mockCanvas;
      service.rowCtx = mockCtx;

      service.resizeRowCanvas(250);

      expect(mockCanvas.width).toBe(250);
      expect(mockCanvas.height).toBe(mockCalendarSetting.cellHeight);
    });

    it('should use direct dimension assignment', () => {
      const mockCanvas = document.createElement('canvas');
      service.rowCanvas = mockCanvas;
      service.rowCtx = mockCanvas.getContext('2d')!;

      spyOn(DrawHelper, 'createHiDPICanvas');

      service.resizeRowCanvas(350);

      expect(DrawHelper.createHiDPICanvas).not.toHaveBeenCalled();
    });
  });

  describe('isCanvasAvailable', () => {
    it('should return true when canvas is available', () => {
      service.canvas = document.createElement('canvas');
      service.ctx = service.canvas.getContext('2d')!;
      service.width = 100;
      service.height = 100;

      expect(service.isCanvasAvailable()).toBe(true);
    });

    it('should return false when canvas is null', () => {
      service.canvas = undefined;
      service.ctx = undefined;

      expect(service.isCanvasAvailable()).toBe(false);
    });

    it('should return false when width is 0', () => {
      service.canvas = document.createElement('canvas');
      service.ctx = service.canvas.getContext('2d')!;
      service.width = 0;
      service.height = 100;

      expect(service.isCanvasAvailable()).toBe(false);
    });

    it('should return false when height is 0', () => {
      service.canvas = document.createElement('canvas');
      service.ctx = service.canvas.getContext('2d')!;
      service.width = 100;
      service.height = 0;

      expect(service.isCanvasAvailable()).toBe(false);
    });

    it('should return false when ctx is null', () => {
      service.canvas = document.createElement('canvas');
      service.ctx = undefined;
      service.width = 100;
      service.height = 100;

      expect(service.isCanvasAvailable()).toBe(false);
    });
  });

  describe('width and height setters', () => {
    it('should trigger resizeMainCanvas when width is set', () => {
      const mockCanvas = document.createElement('canvas');
      service.canvas = mockCanvas;
      service.ctx = mockCanvas.getContext('2d')!;

      spyOn(service, 'resizeMainCanvas');

      service.width = 150;

      expect(service.resizeMainCanvas).toHaveBeenCalled();
    });

    it('should trigger resizeMainCanvas when height is set', () => {
      const mockCanvas = document.createElement('canvas');
      service.canvas = mockCanvas;
      service.ctx = mockCanvas.getContext('2d')!;

      spyOn(service, 'resizeMainCanvas');

      service.height = 250;

      expect(service.resizeMainCanvas).toHaveBeenCalled();
    });
  });

  describe('HiDPI Architecture', () => {
    it('should apply HiDPI only to display and header canvases', () => {
      const mockMainCanvas = document.createElement('canvas');
      mockMainCanvas.id = 'calendarCanvas';
      document.body.appendChild(mockMainCanvas);

      let hiDPICalls = 0;
      spyOn(DrawHelper, 'createHiDPICanvas').and.callFake(() => {
        hiDPICalls++;
        return mockMainCanvas.getContext('2d')!;
      });
      spyOn(DrawHelper, 'setAntiAliasing');

      service.createCanvas();

      expect(hiDPICalls).toBe(2);

      document.body.removeChild(mockMainCanvas);
    });

    it('should keep intermediate buffers without HiDPI scaling', () => {
      const mockMainCanvas = document.createElement('canvas');
      mockMainCanvas.id = 'calendarCanvas';
      document.body.appendChild(mockMainCanvas);

      spyOn(DrawHelper, 'createHiDPICanvas').and.returnValue(
        mockMainCanvas.getContext('2d')!
      );
      spyOn(DrawHelper, 'setAntiAliasing');

      service.createCanvas();

      expect(service.renderCanvas).toBeTruthy();
      expect(service.backgroundRowCanvas).toBeTruthy();
      expect(service.rowCanvas).toBeTruthy();

      document.body.removeChild(mockMainCanvas);
    });
  });
});
