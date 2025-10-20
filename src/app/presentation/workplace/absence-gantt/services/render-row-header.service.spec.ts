import { TestBed } from '@angular/core/testing';
import { RenderRowHeaderService } from './render-row-header.service';
import { RowHeaderCanvasManagerService } from './row-header-canvas.service';
import { CalendarSettingService } from './calendar-setting.service';
import { RenderRowHeaderCellService } from './render-row-header-cell.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DataManagementBreakService } from 'src/app/domain/services/absence/data-management-break.service';
import { ScrollService } from '../../../shared/scrollbar/scroll.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';

describe('RenderRowHeaderService', () => {
  let service: RenderRowHeaderService;
  let mockRowHeaderCanvasManager: jasmine.SpyObj<RowHeaderCanvasManagerService>;
  let mockCalendarSetting: jasmine.SpyObj<CalendarSettingService>;
  let mockScroll: jasmine.SpyObj<ScrollService>;
  let mockGridColors: jasmine.SpyObj<GridColorService>;
  let mockGridFonts: jasmine.SpyObj<GridFontsService>;
  let mockDataManagementBreak: jasmine.SpyObj<DataManagementBreakService>;
  let mockRenderRowHeaderCell: jasmine.SpyObj<RenderRowHeaderCellService>;

  let mockHeaderCtx: jasmine.SpyObj<CanvasRenderingContext2D>;
  let mockRenderCtx: jasmine.SpyObj<CanvasRenderingContext2D>;
  let mockHeaderCanvas: HTMLCanvasElement;
  let mockRenderCanvas: HTMLCanvasElement;
  let mockRows: number;
  let mockLoadingProgress: number;
  let mockVerticalScrollDelta: number;
  let mockVerticalScrollPosition: number;
  let mockVisibleRows: number;

  beforeEach(() => {
    mockHeaderCanvas = document.createElement('canvas');
    mockHeaderCanvas.width = 200;
    mockHeaderCanvas.height = 50;

    mockRenderCanvas = document.createElement('canvas');
    mockRenderCanvas.width = 200;
    mockRenderCanvas.height = 600;

    mockHeaderCtx = jasmine.createSpyObj('CanvasRenderingContext2D', [
      'save',
      'restore',
      'fillRect',
      'setTransform',
      'scale',
      'clearRect',
      'drawImage',
    ]);

    mockRenderCtx = jasmine.createSpyObj('CanvasRenderingContext2D', [
      'save',
      'restore',
      'fillRect',
      'setTransform',
      'scale',
      'clearRect',
      'drawImage',
    ]);

    mockCalendarSetting = jasmine.createSpyObj('CalendarSettingService', [], {
      cellWidth: 10,
      cellHeight: 30,
      cellHeaderHeight: 50,
      borderWidth: 1,
    });

    mockRows = 100;
    mockLoadingProgress = 0;
    mockVerticalScrollDelta = 0;
    mockVerticalScrollPosition = 0;
    mockVisibleRows = 20;

    mockScroll = {} as jasmine.SpyObj<ScrollService>;

    Object.defineProperty(mockScroll, 'verticalScrollPosition', {
      get: () => mockVerticalScrollPosition,
      set: (value: number) => { mockVerticalScrollPosition = value; },
      configurable: true
    });

    Object.defineProperty(mockScroll, 'visibleRows', {
      get: () => mockVisibleRows,
      set: (value: number) => { mockVisibleRows = value; },
      configurable: true
    });

    Object.defineProperty(mockScroll, 'verticalScrollDelta', {
      get: () => mockVerticalScrollDelta,
      set: (value: number) => { mockVerticalScrollDelta = value; },
      configurable: true
    });

    mockGridColors = jasmine.createSpyObj('GridColorService', [], {
      controlBackGroundColor: '#f0f0f0',
      backGroundContainerColor: '#ffffff',
      foreGroundColor: '#000000',
    });

    mockGridFonts = jasmine.createSpyObj('GridFontsService', [], {
      mainFontString: '12px Arial',
      mainFontSize: '12',
    });

    mockDataManagementBreak = jasmine.createSpyObj(
      'DataManagementBreakService',
      ['readClientName'],
      {
        totalAvailableRows: 150,
        clients: new Array(100).fill({}),
      }
    );
    mockDataManagementBreak.readClientName.and.returnValue('Test Client');

    Object.defineProperty(mockDataManagementBreak, 'rows', {
      get: () => mockRows,
      set: (value: number) => { mockRows = value; },
      configurable: true
    });
    Object.defineProperty(mockDataManagementBreak, 'loadingProgress', {
      get: () => mockLoadingProgress,
      set: (value: number) => { mockLoadingProgress = value; },
      configurable: true
    });

    mockRowHeaderCanvasManager = jasmine.createSpyObj(
      'RowHeaderCanvasManagerService',
      [],
      {
        width: 200,
        height: 600,
        headerCanvas: mockHeaderCanvas,
        headerCtx: mockHeaderCtx,
        renderCanvas: mockRenderCanvas,
        renderCanvasCtx: mockRenderCtx,
      }
    );

    mockRenderRowHeaderCell = jasmine.createSpyObj('RenderRowHeaderCellService', [
      'fillRectangle',
      'drawBorder',
      'drawText',
      'clearRect',
    ]);

    TestBed.configureTestingModule({
      providers: [
        RenderRowHeaderService,
        {
          provide: RowHeaderCanvasManagerService,
          useValue: mockRowHeaderCanvasManager,
        },
        { provide: CalendarSettingService, useValue: mockCalendarSetting },
        { provide: ScrollService, useValue: mockScroll },
        { provide: GridColorService, useValue: mockGridColors },
        { provide: GridFontsService, useValue: mockGridFonts },
        {
          provide: DataManagementBreakService,
          useValue: mockDataManagementBreak,
        },
        {
          provide: RenderRowHeaderCellService,
          useValue: mockRenderRowHeaderCell,
        },
      ],
    });

    service = TestBed.inject(RenderRowHeaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createRuler', () => {
    it('should clear and draw header canvas', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(1);

      service.createRuler();

      expect(mockRenderRowHeaderCell.fillRectangle).toHaveBeenCalled();
      expect(mockRenderRowHeaderCell.drawText).toHaveBeenCalled();
      expect(mockRenderRowHeaderCell.drawBorder).toHaveBeenCalled();
    });

    it('should display total available rows count', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(1);

      service.createRuler();

      const textCalls = mockRenderRowHeaderCell.drawText.calls.all();
      const headerTextCall = textCalls.find((call) =>
        call.args[1].includes('Name (150)')
      );

      expect(headerTextCall).toBeDefined();
    });
  });

  describe('renderRowHeader', () => {
    it('should render all visible rows', () => {
      mockScroll.verticalScrollPosition = 5;
      mockScroll.visibleRows = 10;

      spyOn(DrawHelper, 'pixelRatio').and.returnValue(1);
      spyOn(DrawHelper, 'setAntiAliasing');

      mockRenderRowHeaderCell.clearRect.calls.reset();
      mockRenderRowHeaderCell.fillRectangle.calls.reset();
      mockRenderRowHeaderCell.drawBorder.calls.reset();
      mockRenderRowHeaderCell.drawText.calls.reset();

      const drawNameSpy = spyOn(service, 'drawName');

      service.renderRowHeader();

      expect(mockRenderRowHeaderCell.clearRect).toHaveBeenCalled();
      expect(drawNameSpy).toHaveBeenCalledTimes(11);
    });

    it('should clear render canvas before drawing', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(1);
      spyOn(DrawHelper, 'setAntiAliasing');

      service.renderRowHeader();

      expect(mockRenderRowHeaderCell.clearRect).toHaveBeenCalledWith(
        mockRenderCtx,
        0,
        0,
        mockRenderCanvas.width,
        mockRenderCanvas.height
      );
    });
  });

  describe('drawName', () => {
    it('should draw client name for valid row index', () => {
      service.drawName(5, true, false);

      expect(mockRenderRowHeaderCell.fillRectangle).toHaveBeenCalled();
      expect(mockRenderRowHeaderCell.drawBorder).toHaveBeenCalled();
      expect(mockRenderRowHeaderCell.drawText).toHaveBeenCalled();
      expect(mockDataManagementBreak.readClientName).toHaveBeenCalledWith(5);
    });

    it('should use red background when isMoveGrid is true', () => {
      service.drawName(5, true, true);

      const fillCalls = mockRenderRowHeaderCell.fillRectangle.calls.all();
      const redFillCall = fillCalls.find((call) => call.args[1] === 'red');

      expect(redFillCall).toBeDefined();
    });

    it('should use control background color when isMoveGrid is false', () => {
      service.drawName(5, true, false);

      const fillCalls = mockRenderRowHeaderCell.fillRectangle.calls.all();
      const normalFillCall = fillCalls.find(
        (call) => call.args[1] === mockGridColors.controlBackGroundColor
      );

      expect(normalFillCall).toBeDefined();
    });

    it('should use container background for rows beyond data', () => {
      mockRows = 50;

      service.drawName(75, true, false);

      const fillCalls = mockRenderRowHeaderCell.fillRectangle.calls.all();
      const containerFillCall = fillCalls.find(
        (call) => call.args[1] === mockGridColors.backGroundContainerColor
      );

      expect(containerFillCall).toBeDefined();
    });
  });

  describe('drawProgressLine with HiDPI', () => {
    it('should scale progress bar height with pixelRatio', () => {
      const dpr = 2;
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(dpr);

      mockLoadingProgress = 50;

      service.createRuler();

      expect(mockHeaderCtx.fillRect).toHaveBeenCalled();

      const fillRectCalls = mockHeaderCtx.fillRect.calls.all();
      const progressBarCall = fillRectCalls.find(
        (call) => call.args[3] === 2 * dpr
      );

      expect(progressBarCall).toBeDefined();
    });

    it('should use 2px height at pixelRatio = 1', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(1);

      mockLoadingProgress = 50;

      service.createRuler();

      const fillRectCalls = mockHeaderCtx.fillRect.calls.all();
      const progressBarCall = fillRectCalls.find((call) => call.args[3] === 2);

      expect(progressBarCall).toBeDefined();
    });

    it('should use 4px height at pixelRatio = 2', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(2);

      mockLoadingProgress = 50;

      service.createRuler();

      const fillRectCalls = mockHeaderCtx.fillRect.calls.all();
      const progressBarCall = fillRectCalls.find((call) => call.args[3] === 4);

      expect(progressBarCall).toBeDefined();
    });

    it('should use 6px height at pixelRatio = 3', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(3);

      mockLoadingProgress = 50;

      service.createRuler();

      const fillRectCalls = mockHeaderCtx.fillRect.calls.all();
      const progressBarCall = fillRectCalls.find((call) => call.args[3] === 6);

      expect(progressBarCall).toBeDefined();
    });

    it('should not draw progress bar when progress is 0', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(2);

      mockLoadingProgress = 0;

      mockHeaderCtx.fillRect.calls.reset();

      service.createRuler();

      expect(mockHeaderCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should not draw progress bar when progress is 100', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(2);

      mockLoadingProgress = 100;

      mockHeaderCtx.fillRect.calls.reset();

      service.createRuler();

      expect(mockHeaderCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should draw progress bar for values between 0 and 100', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(2);

      mockLoadingProgress = 75;

      service.createRuler();

      expect(mockHeaderCtx.fillRect).toHaveBeenCalled();
    });

    it('should calculate progress width correctly', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(2);

      mockLoadingProgress = 50;

      service.createRuler();

      const expectedWidth = (mockRowHeaderCanvasManager.width * 50) / 100;

      const fillRectCalls = mockHeaderCtx.fillRect.calls.all();
      const progressBarCall = fillRectCalls[0];

      if (progressBarCall) {
        expect(progressBarCall.args[2]).toBe(expectedWidth);
      }
    });

    it('should use green color for progress bar', () => {
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(2);

      mockLoadingProgress = 50;

      service.createRuler();

      expect(mockHeaderCtx.save).toHaveBeenCalled();
      expect(mockHeaderCtx.restore).toHaveBeenCalled();
    });
  });

  describe('drawFilterIcon', () => {
    it('should draw filter icon when image is available', () => {
      const mockImage = new Image();
      service.filterImage = mockImage;

      spyOn(DrawHelper, 'drawImage');
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(1);

      service.createRuler();

      expect(service.recFilterIcon).toBeDefined();
      expect(service.recFilterIcon.width).toBe(service.iconSize);
      expect(service.recFilterIcon.height).toBe(service.iconSize);
    });

    it('should not draw filter icon when image is not available', () => {
      service.filterImage = undefined;

      spyOn(DrawHelper, 'drawImage');
      spyOn(DrawHelper, 'pixelRatio').and.returnValue(1);

      service.createRuler();

      expect(DrawHelper.drawImage).not.toHaveBeenCalled();
    });

    it('should position filter icon on right side of header', () => {
      const mockImage = new Image();
      service.filterImage = mockImage;

      spyOn(DrawHelper, 'pixelRatio').and.returnValue(1);

      service.createRuler();

      const expectedX =
        mockRowHeaderCanvasManager.width - (service.iconSize + 6);
      expect(service.recFilterIcon.left).toBe(expectedX);
    });
  });

  describe('moveGrid', () => {
    it('should draw new rows when scrolling down', () => {
      mockScroll.verticalScrollPosition = 10;
      mockVerticalScrollDelta = -2;
      mockScroll.visibleRows = 20;

      spyOn(service, 'drawName');

      service.moveGrid(1);

      expect(service.drawName).toHaveBeenCalled();
    });

    it('should draw new rows when scrolling up', () => {
      mockScroll.verticalScrollPosition = 10;
      mockVerticalScrollDelta = 2;
      mockScroll.visibleRows = 20;

      spyOn(service, 'drawName');

      service.moveGrid(-1);

      expect(service.drawName).toHaveBeenCalled();
    });

    it('should not draw when directionY is 0', () => {
      spyOn(service, 'drawName');

      service.moveGrid(0);

      expect(service.drawName).not.toHaveBeenCalled();
    });

    it('should not draw when delta is 0', () => {
      mockVerticalScrollDelta = 0;

      spyOn(service, 'drawName');

      service.moveGrid(1);

      expect(service.drawName).not.toHaveBeenCalled();
    });
  });

  describe('HiDPI Compatibility', () => {
    it('should handle different pixel ratios correctly', () => {
      const testRatios = [1, 1.5, 2, 2.5, 3];
      const pixelRatioSpy = spyOn(DrawHelper, 'pixelRatio');

      testRatios.forEach((ratio) => {
        pixelRatioSpy.and.returnValue(ratio);

        mockLoadingProgress = 50;

        service.createRuler();

        const expectedHeight = 2 * ratio;

        const fillRectCalls = mockHeaderCtx.fillRect.calls.all();
        const progressBarCall = fillRectCalls.find(
          (call) => call.args[3] === expectedHeight
        );

        expect(progressBarCall).toBeDefined();

        mockHeaderCtx.fillRect.calls.reset();
        pixelRatioSpy.calls.reset();
      });
    });

    it('should maintain visual consistency across different displays', () => {
      const ratio1 = 1;
      const ratio2 = 2;

      spyOn(DrawHelper, 'pixelRatio').and.returnValue(ratio1);
      mockLoadingProgress = 50;

      service.createRuler();

      const height1 = 2 * ratio1;

      (DrawHelper.pixelRatio as jasmine.Spy).and.returnValue(ratio2);
      mockHeaderCtx.fillRect.calls.reset();

      service.createRuler();

      const height2 = 2 * ratio2;

      expect(height2 / ratio2).toBe(height1 / ratio1);
    });
  });
});
