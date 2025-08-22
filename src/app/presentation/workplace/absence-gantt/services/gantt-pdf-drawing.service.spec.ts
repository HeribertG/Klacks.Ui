import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';
import { GanttPdfDrawingService, GanttDrawingConfig } from './gantt-pdf-drawing.service';
import { HolidaysListHelper } from 'src/app/domain/models/calendar-rule-class';

describe('GanttPdfDrawingService', () => {
  let service: GanttPdfDrawingService;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;
  let mockHolidaysHelper: jasmine.SpyObj<HolidaysListHelper>;
  let mockPdf: jasmine.SpyObj<jsPDF>;

  beforeEach(() => {
    const translateSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateSpy.instant.and.returnValue('Translated');

    TestBed.configureTestingModule({
      providers: [
        GanttPdfDrawingService,
        { provide: TranslateService, useValue: translateSpy }
      ]
    });

    service = TestBed.inject(GanttPdfDrawingService);
    mockTranslateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
    
    // Create spy on the actual holidaysHelper instance
    mockHolidaysHelper = jasmine.createSpyObj('HolidaysListHelper', ['getTotalDaysInCurrentYear', 'getDaysInMonth']);
    mockHolidaysHelper.getTotalDaysInCurrentYear.and.returnValue(365);
    mockHolidaysHelper.getDaysInMonth.and.returnValue(31); // Default to 31 days
    (service as any).holidaysHelper = mockHolidaysHelper;

    // Create mock jsPDF instance
    mockPdf = jasmine.createSpyObj('jsPDF', [
      'setFillColor',
      'rect',
      'setDrawColor',
      'setLineWidth',
      'line',
      'setTextColor',
      'setFontSize',
      'text',
      'getTextWidth',
      'setFont'
    ]);
    mockPdf.getTextWidth.and.returnValue(50);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createDefaultConfig', () => {
    it('should create default configuration with current year', () => {
      const config = service.createDefaultConfig();
      
      expect(config.pageWidth).toBe(1190.55);
      expect(config.pageHeight).toBe(841.89);
      expect(config.rowHeaderWidth).toBeCloseTo(142.866); // 12% of pageWidth
      expect(config.rowHeight).toBe(25);
      expect(config.year).toBe(new Date().getFullYear());
      expect(config.evenMonthColor).toBe('#f9f9f9');
      expect(config.oddMonthColor).toBe('#ffffff');
      expect(config.weekendColor).toBe('#fffbcc');
      expect(config.dayLineColor).toBe('#e0e0e0');
      expect(config.monthBorderColor).toBe('#888888');
      expect(config.lineWidth).toBe(0.5);
    });
  });

  describe('getDaysInYear', () => {
    it('should return 365 for non-leap year', () => {
      mockHolidaysHelper.getTotalDaysInCurrentYear.and.returnValue(365);
      mockHolidaysHelper.currentYear = 2023;
      
      expect(service.getDaysInYear(2023)).toBe(365);
      expect(mockHolidaysHelper.currentYear).toBe(2023);
      expect(mockHolidaysHelper.getTotalDaysInCurrentYear).toHaveBeenCalled();
    });

    it('should return 366 for leap year', () => {
      mockHolidaysHelper.getTotalDaysInCurrentYear.and.returnValue(366);
      mockHolidaysHelper.currentYear = 2024;
      
      expect(service.getDaysInYear(2024)).toBe(366);
      expect(mockHolidaysHelper.currentYear).toBe(2024);
      expect(mockHolidaysHelper.getTotalDaysInCurrentYear).toHaveBeenCalled();
    });
    
    it('should use HolidaysListHelper for calculation', () => {
      mockHolidaysHelper.getTotalDaysInCurrentYear.and.returnValue(366);
      const days = service.getDaysInYear(2024);
      expect(days).toBe(366);
      expect(mockHolidaysHelper.getTotalDaysInCurrentYear).toHaveBeenCalled();
    });
  });

  describe('getActualRowHeaderWidth', () => {
    it('should calculate 12% of page width', () => {
      const config: GanttDrawingConfig = {
        pageWidth: 1000,
        pageHeight: 700,
        rowHeaderWidth: 120,
        rowHeight: 25,
        year: 2024,
        startDate: new Date(2024, 0, 1),
        evenMonthColor: '#f9f9f9',
        oddMonthColor: '#ffffff',
        weekendColor: '#fffbcc',
        dayLineColor: '#e0e0e0',
        monthBorderColor: '#888888',
        lineWidth: 0.5
      };

      expect(service.getActualRowHeaderWidth(config)).toBe(120);
    });
  });

  describe('getCalendarWidth', () => {
    it('should calculate calendar width correctly', () => {
      const config: GanttDrawingConfig = {
        pageWidth: 1000,
        pageHeight: 700,
        rowHeaderWidth: 120,
        rowHeight: 25,
        year: 2024,
        startDate: new Date(2024, 0, 1),
        evenMonthColor: '#f9f9f9',
        oddMonthColor: '#ffffff',
        weekendColor: '#fffbcc',
        dayLineColor: '#e0e0e0',
        monthBorderColor: '#888888',
        lineWidth: 0.5
      };

      // 83% of 1000 = 830, minus 2 * 0.5 = 829
      expect(service.getCalendarWidth(config)).toBe(829);
    });
  });

  describe('drawRowHeader', () => {
    it('should draw row header with correct styling', () => {
      const config = service.createDefaultConfig();
      
      service.drawRowHeader(mockPdf, 10, 20, config, 30, 'Test Client');

      // Check background
      expect(mockPdf.setFillColor).toHaveBeenCalled();
      expect(mockPdf.rect).toHaveBeenCalledWith(10, 20, jasmine.any(Number), 30, 'F');

      // Check border
      expect(mockPdf.setDrawColor).toHaveBeenCalled();
      expect(mockPdf.setLineWidth).toHaveBeenCalledWith(1);

      // Check text
      expect(mockPdf.setTextColor).toHaveBeenCalled();
      expect(mockPdf.setFontSize).toHaveBeenCalledWith(10);
      expect(mockPdf.text).toHaveBeenCalledWith('Test Client', 15, jasmine.any(Number));
    });

    it('should draw top border when requested', () => {
      const config = service.createDefaultConfig();
      
      service.drawRowHeader(mockPdf, 10, 20, config, 30, 'Test', '#f5f5f5', '#000000', true);

      // Should draw 4 lines including top
      const lineCalls = mockPdf.line.calls.all();
      expect(lineCalls.length).toBe(4);
    });
  });

  describe('drawMonthHeaders', () => {
    it('should draw month headers with translated names', () => {
      const config = service.createDefaultConfig();
      
      service.drawMonthHeaders(mockPdf, 0, 0, config, 20);

      // Should translate all 12 months
      expect(mockTranslateService.instant).toHaveBeenCalledTimes(12);
      
      // Should draw backgrounds and borders for each month
      const rectCalls = mockPdf.rect.calls.all();
      expect(rectCalls.length).toBeGreaterThan(0);
      
      // Should draw month names
      const textCalls = mockPdf.text.calls.all();
      expect(textCalls.length).toBe(12);
    });
  });

  describe('drawRowSeparatorLine', () => {
    it('should draw horizontal line across full width', () => {
      const config = service.createDefaultConfig();
      
      service.drawRowSeparatorLine(mockPdf, 10, 50, config);

      expect(mockPdf.setDrawColor).toHaveBeenCalled();
      expect(mockPdf.setLineWidth).toHaveBeenCalledWith(jasmine.any(Number));
      expect(mockPdf.line).toHaveBeenCalled();
    });
  });

  describe('drawBreakBar', () => {
    it('should draw break bar within current year', () => {
      const config = service.createDefaultConfig();
      const breakData = {
        from: new Date(config.year, 2, 15).toISOString(), // March 15
        until: new Date(config.year, 2, 20).toISOString(), // March 20
        absence: { color: '#ff0000' }
      };

      service.drawBreakBar(mockPdf, 0, 0, config, breakData, 30);

      // Should set break color
      expect(mockPdf.setFillColor).toHaveBeenCalled();
      
      // Should draw bar
      const rectCalls = mockPdf.rect.calls.all();
      expect(rectCalls.length).toBeGreaterThan(0);
    });

    it('should skip break outside current year', () => {
      const config = service.createDefaultConfig();
      const breakData = {
        from: new Date(config.year - 1, 2, 15).toISOString(),
        until: new Date(config.year - 1, 2, 20).toISOString(),
        absence: { color: '#ff0000' }
      };

      service.drawBreakBar(mockPdf, 0, 0, config, breakData, 30);

      // Should not draw anything
      expect(mockPdf.rect).not.toHaveBeenCalled();
    });

    it('should use default color if absence color not provided', () => {
      const config = service.createDefaultConfig();
      const breakData = {
        from: new Date(config.year, 2, 15).toISOString(),
        until: new Date(config.year, 2, 20).toISOString()
      };

      service.drawBreakBar(mockPdf, 0, 0, config, breakData, 30);

      expect(mockPdf.setFillColor).toHaveBeenCalled();
    });
  });

  describe('drawRowBreaks', () => {
    it('should draw multiple breaks', () => {
      const config = service.createDefaultConfig();
      const breaks = [
        {
          from: new Date(config.year, 2, 15).toISOString(),
          until: new Date(config.year, 2, 20).toISOString(),
          absence: { color: '#ff0000' }
        },
        {
          from: new Date(config.year, 5, 1).toISOString(),
          until: new Date(config.year, 5, 10).toISOString(),
          absence: { color: '#00ff00' }
        }
      ];

      spyOn(service, 'drawBreakBar');
      service.drawRowBreaks(mockPdf, 0, 0, config, breaks, 30);

      expect(service.drawBreakBar).toHaveBeenCalledTimes(2);
    });

    it('should handle empty breaks array', () => {
      const config = service.createDefaultConfig();
      
      spyOn(service, 'drawBreakBar');
      service.drawRowBreaks(mockPdf, 0, 0, config, [], 30);

      expect(service.drawBreakBar).not.toHaveBeenCalled();
    });
  });

  describe('drawLegend', () => {
    it('should draw legend items with colors and names', () => {
      const selectedTypes = [
        { id: '1', name: 'Vacation', color: '#ff0000' },
        { id: '2', name: 'Sick Leave', color: '#00ff00' }
      ];

      service.drawLegend(mockPdf, 0, 0, 200, 50, selectedTypes);

      // Should draw color boxes
      expect(mockPdf.setFillColor).toHaveBeenCalled();
      expect(mockPdf.setFillColor.calls.count()).toBeGreaterThanOrEqual(2);
      
      // Should draw text labels
      expect(mockPdf.text).toHaveBeenCalledWith('Vacation', jasmine.any(Number), jasmine.any(Number));
      expect(mockPdf.text).toHaveBeenCalledWith('Sick Leave', jasmine.any(Number), jasmine.any(Number));
    });

    it('should handle line wrapping for many items', () => {
      const selectedTypes = Array(10).fill(null).map((_, i) => ({
        id: String(i),
        name: `Very Long Absence Type Name ${i}`,
        color: '#ff0000'
      }));

      service.drawLegend(mockPdf, 0, 0, 200, 100, selectedTypes);

      // Should still draw all items
      const textCalls = mockPdf.text.calls.all();
      expect(textCalls.length).toBe(10);
    });
  });

  describe('drawCompleteRow', () => {
    it('should draw all row components', () => {
      const config = service.createDefaultConfig();
      const breaks = [{
        from: new Date(config.year, 2, 15).toISOString(),
        until: new Date(config.year, 2, 20).toISOString(),
        absence: { color: '#ff0000' }
      }];

      spyOn(service, 'drawRowHeader');
      spyOn(service, 'drawRowBackground');
      spyOn(service, 'drawRowBreaks');
      spyOn(service, 'drawRowSeparatorLine');

      service.drawCompleteRow(mockPdf, 0, 0, config, 'Test Client', false, 20, true, false, breaks);

      expect(service.drawRowHeader).toHaveBeenCalled();
      expect(service.drawRowBackground).toHaveBeenCalled();
      expect(service.drawRowBreaks).toHaveBeenCalledWith(mockPdf, 0, 0, config, breaks, config.rowHeight);
      expect(service.drawRowSeparatorLine).toHaveBeenCalled();
    });

    it('should include month headers when requested', () => {
      const config = service.createDefaultConfig();
      
      spyOn(service, 'drawMonthHeaders');
      
      service.drawCompleteRow(mockPdf, 0, 0, config, 'Test', true);

      expect(service.drawMonthHeaders).toHaveBeenCalled();
    });
  });
});