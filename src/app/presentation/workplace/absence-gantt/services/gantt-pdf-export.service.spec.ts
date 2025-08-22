/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';
import { DataManagementBreakService } from 'src/app/domain/services/data-management-break.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/data-management-absence-gantt.service';
import { GanttPdfDrawingService } from './gantt-pdf-drawing.service';
import { GanttPdfExportService, GanttExportOptions } from './gantt-pdf-export.service';
import { BreakFilter } from 'src/app/domain/models/break-class';

describe('GanttPdfExportService', () => {
  let service: GanttPdfExportService;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;
  let mockDataManagementBreak: jasmine.SpyObj<DataManagementBreakService>;
  let mockDataManagementAbsence: jasmine.SpyObj<DataManagementAbsenceGanttService>;
  let mockGanttPdfDrawingService: jasmine.SpyObj<GanttPdfDrawingService>;
  let mockPdf: jasmine.SpyObj<jsPDF>;

  beforeEach(() => {
    // Create spies
    const translateSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
      'currentLang',
    ]);
    const mockBreakFilter = new BreakFilter();
    const dataBreakSpy = jasmine.createSpyObj(
      'DataManagementBreakService',
      ['readClientName', 'readData', 'rows'],
      {
        breakFilter: mockBreakFilter,
      }
    );
    // Set up rows property
    Object.defineProperty(dataBreakSpy, 'rows', {
      get: jasmine.createSpy('rows').and.returnValue(5),
      configurable: true,
    });
    const dataAbsenceSpy = jasmine.createSpyObj(
      'DataManagementAbsenceGanttService',
      ['absenceList']
    );
    const drawingSpy = jasmine.createSpyObj('GanttPdfDrawingService', [
      'createDefaultConfig',
      'drawLegend',
      'drawMonthHeaders',
      'drawRowSeparatorLine',
      'drawCompleteRow',
      'getDaysInYear',
    ]);

    // Set up mock returns
    translateSpy.instant.and.returnValue('Translated');
    translateSpy.currentLang = 'en';
    dataBreakSpy.readClientName.and.returnValue('Test Client');
    dataBreakSpy.readData.and.returnValue([]);
    dataAbsenceSpy.absenceList.and.returnValue([]);
    drawingSpy.createDefaultConfig.and.returnValue({
      pageWidth: 1190.55,
      pageHeight: 841.89,
      rowHeaderWidth: 142.866,
      rowHeight: 25,
      year: 2024,
      startDate: new Date(2024, 0, 1),
      evenMonthColor: '#f9f9f9',
      oddMonthColor: '#ffffff',
      weekendColor: '#fffbcc',
      dayLineColor: '#e0e0e0',
      monthBorderColor: '#888888',
      lineWidth: 0.5,
    });
    drawingSpy.getDaysInYear.and.returnValue(365);

    TestBed.configureTestingModule({
      providers: [
        GanttPdfExportService,
        { provide: TranslateService, useValue: translateSpy },
        { provide: DataManagementBreakService, useValue: dataBreakSpy },
        {
          provide: DataManagementAbsenceGanttService,
          useValue: dataAbsenceSpy,
        },
        { provide: GanttPdfDrawingService, useValue: drawingSpy },
      ],
    });

    service = TestBed.inject(GanttPdfExportService);
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;
    mockDataManagementBreak = TestBed.inject(
      DataManagementBreakService
    ) as jasmine.SpyObj<DataManagementBreakService>;
    mockDataManagementAbsence = TestBed.inject(
      DataManagementAbsenceGanttService
    ) as jasmine.SpyObj<DataManagementAbsenceGanttService>;
    mockGanttPdfDrawingService = TestBed.inject(
      GanttPdfDrawingService
    ) as jasmine.SpyObj<GanttPdfDrawingService>;

    // Create mock jsPDF
    mockPdf = jasmine.createSpyObj('jsPDF', [
      'setFontSize',
      'setFont',
      'text',
      'addPage',
      'save',
    ]);

    // Mock jsPDF constructor - need to mock the actual jsPDF import
    spyOn(service as any, 'createPdfInstance').and.returnValue(mockPdf);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSelectedAbsenceTypes', () => {
    it('should return selected absence types with localized names', () => {
      // Setup mock data
      mockDataManagementBreak.breakFilter.absences = [
        { id: '1', name: 'Vacation', checked: true },
        { id: '2', name: 'Sick', checked: false },
        { id: '3', name: 'Holiday', checked: true },
      ];

      mockDataManagementAbsence.absenceList.and.returnValue([
        {
          id: '1',
          name: { en: 'Vacation EN', de: 'Urlaub' },
          color: '#ff0000',
        },
        {
          id: '3',
          name: { en: 'Holiday EN', de: 'Feiertag' },
          color: '#00ff00',
        },
      ] as any);

      const result = service['getSelectedAbsenceTypes']();

      expect(result.length).toBe(2);
      expect(result[0]).toEqual({
        id: '1',
        name: 'Vacation EN',
        color: '#ff0000',
      });
      expect(result[1]).toEqual({
        id: '3',
        name: 'Holiday EN',
        color: '#00ff00',
      });
    });

    it('should use fallback color if absence has no color', () => {
      mockDataManagementBreak.breakFilter.absences = [
        { id: '1', name: 'Vacation', checked: true },
      ];

      mockDataManagementAbsence.absenceList.and.returnValue([
        { id: '1', name: { en: 'Vacation' } } as any,
      ]);

      const result = service['getSelectedAbsenceTypes']();

      expect(result[0].color).toBe('#ff6b6b');
    });

    it('should handle errors gracefully', () => {
      mockDataManagementBreak.breakFilter = null as any;

      const result = service['getSelectedAbsenceTypes']();

      expect(result).toEqual([]);
    });
  });

  describe('addPageHeader', () => {
    it('should add title and page information', () => {
      service['addPageHeader'](mockPdf, 'Test Title', 1, 3);

      // Check title
      expect(mockPdf.setFontSize).toHaveBeenCalledWith(16);
      expect(mockPdf.setFont).toHaveBeenCalledWith('helvetica', 'bold');
      expect(mockPdf.text).toHaveBeenCalledWith('Test Title', 20, 40);

      // Check date and page info
      expect(mockPdf.setFontSize).toHaveBeenCalledWith(10);
      expect(mockPdf.setFont).toHaveBeenCalledWith('helvetica', 'normal');

      // Should call translate for labels
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'pdf.generated'
      );
      expect(mockTranslateService.instant).toHaveBeenCalledWith('pdf.page');
      expect(mockTranslateService.instant).toHaveBeenCalledWith('pdf.of');
    });
  });

  describe('exportTest2DDrawing', () => {
    beforeEach(() => {
      // Set current year in break filter
      mockDataManagementBreak.breakFilter.currentYear = 2024;
    });

    it('should use current year from break filter in title', async () => {
      await service.exportTest2DDrawing();

      // Check that title contains current year
      expect(mockPdf.text).toHaveBeenCalledWith(
        jasmine.stringContaining('Gantt Chart 2024'),
        jasmine.any(Number),
        jasmine.any(Number)
      );
    });

    it('should use custom title if provided', async () => {
      const options: GanttExportOptions = {
        title: 'Custom Export Title',
      };

      await service.exportTest2DDrawing(options);

      expect(mockPdf.text).toHaveBeenCalledWith(
        jasmine.stringContaining('Custom Export Title'),
        jasmine.any(Number),
        jasmine.any(Number)
      );
    });

    it('should draw legend if absence types are selected', async () => {
      mockDataManagementBreak.breakFilter.absences = [
        { id: '1', name: 'Vacation', checked: true },
      ];
      mockDataManagementAbsence.absenceList.and.returnValue([
        { id: '1', name: { en: 'Vacation' }, color: '#ff0000' } as any,
      ]);

      await service.exportTest2DDrawing();

      expect(mockGanttPdfDrawingService.drawLegend).toHaveBeenCalled();
    });

    it('should not draw legend if no absence types selected', async () => {
      mockDataManagementBreak.breakFilter.absences = [];

      await service.exportTest2DDrawing();

      expect(mockGanttPdfDrawingService.drawLegend).not.toHaveBeenCalled();
    });

    it('should draw month headers', async () => {
      await service.exportTest2DDrawing();

      expect(mockGanttPdfDrawingService.drawMonthHeaders).toHaveBeenCalled();
    });

    it('should draw rows for each client', async () => {
      Object.defineProperty(mockDataManagementBreak, 'rows', {
        get: jasmine.createSpy('rows').and.returnValue(3),
      });
      mockDataManagementBreak.readClientName.and.returnValues(
        'Client 1',
        'Client 2',
        'Client 3'
      );
      mockDataManagementBreak.readData.and.returnValue([]);

      await service.exportTest2DDrawing();

      expect(mockGanttPdfDrawingService.drawCompleteRow).toHaveBeenCalledTimes(
        3
      );
    });

    it('should handle pagination for many clients', async () => {
      Object.defineProperty(mockDataManagementBreak, 'rows', {
        get: jasmine.createSpy('rows').and.returnValue(50),
      });
      mockDataManagementBreak.readClientName.and.returnValue('Client');
      mockDataManagementBreak.readData.and.returnValue([]);

      await service.exportTest2DDrawing();

      // Should add new pages - based on 50 clients with 25 row height and page limits
      expect(mockPdf.addPage).toHaveBeenCalled();

      // Should redraw headers on new pages
      expect(mockGanttPdfDrawingService.drawMonthHeaders).toHaveBeenCalled();
    });

    it('should pass break data to drawCompleteRow', async () => {
      const mockBreaks = [
        {
          id: '1',
          clientId: 'client1',
          client: {} as any,
          from: '2024-03-15',
          until: '2024-03-20',
          absence: { color: '#ff0000' } as any,
          internalFrom: new Date('2024-03-15'),
          internalUntil: new Date('2024-03-20'),
          remark: '',
        },
      ] as any[];
      Object.defineProperty(mockDataManagementBreak, 'rows', {
        get: jasmine.createSpy('rows').and.returnValue(1),
      });
      mockDataManagementBreak.readData.and.returnValue(mockBreaks);

      await service.exportTest2DDrawing();

      expect(mockGanttPdfDrawingService.drawCompleteRow).toHaveBeenCalledWith(
        mockPdf,
        jasmine.any(Number),
        jasmine.any(Number),
        jasmine.any(Object),
        jasmine.any(String),
        false,
        20,
        jasmine.any(Boolean),
        jasmine.any(Boolean),
        mockBreaks
      );
    });

    it('should display message when no client data available', async () => {
      Object.defineProperty(mockDataManagementBreak, 'rows', {
        get: jasmine.createSpy('rows').and.returnValue(0),
      });

      await service.exportTest2DDrawing();

      expect(mockPdf.text).toHaveBeenCalledWith(
        'No client data available',
        jasmine.any(Number),
        jasmine.any(Number)
      );
      expect(mockPdf.text).toHaveBeenCalledWith(
        'Please ensure that data has been loaded',
        jasmine.any(Number),
        jasmine.any(Number)
      );
    });

    it('should display summary when clients are exported', async () => {
      Object.defineProperty(mockDataManagementBreak, 'rows', {
        get: jasmine.createSpy('rows').and.returnValue(5),
      });
      mockDataManagementBreak.readClientName.and.returnValue('Client');

      await service.exportTest2DDrawing();

      expect(mockPdf.text).toHaveBeenCalledWith(
        jasmine.stringContaining('Total 5 clients exported'),
        jasmine.any(Number),
        jasmine.any(Number)
      );
      expect(mockPdf.text).toHaveBeenCalledWith(
        jasmine.stringContaining('Year: 2024'),
        jasmine.any(Number),
        jasmine.any(Number)
      );
    });

    it('should save PDF with timestamp in filename', async () => {
      const mockDate = new Date('2024-03-15T10:30:00');
      jasmine.clock().install();
      jasmine.clock().mockDate(mockDate);

      await service.exportTest2DDrawing();

      // Use the actual timestamp from the mocked date
      const expectedTimestamp = mockDate.getTime();
      expect(mockPdf.save).toHaveBeenCalledWith(
        `gantt-real-data-${expectedTimestamp}.pdf`
      );

      jasmine.clock().uninstall();
    });

    it('should use year from break filter for config', async () => {
      mockDataManagementBreak.breakFilter.currentYear = 2025;

      await service.exportTest2DDrawing();

      // Verify the year is used in the summary text
      expect(mockPdf.text).toHaveBeenCalledWith(
        jasmine.stringContaining('Year: 2025'),
        jasmine.any(Number),
        jasmine.any(Number)
      );
    });
  });

  describe('A3_LANDSCAPE dimensions', () => {
    it('should have correct A3 landscape dimensions', () => {
      expect(service['A3_LANDSCAPE'].width).toBe(1190.55);
      expect(service['A3_LANDSCAPE'].height).toBe(841.89);
    });
  });

  describe('MARGINS', () => {
    it('should have appropriate margins', () => {
      expect(service['MARGINS'].top).toBe(40);
      expect(service['MARGINS'].left).toBe(20);
      expect(service['MARGINS'].right).toBe(20);
      expect(service['MARGINS'].bottom).toBe(30);
    });
  });

  afterEach(() => {
    // Clean up in case test failed
    if (jasmine.clock) {
      try {
        jasmine.clock().uninstall();
      } catch {
        // Already uninstalled
      }
    }
  });
});
