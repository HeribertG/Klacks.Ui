// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { InboxEmailPdfExportService, InboxEmailPrintData } from './inbox-email-pdf-export.service';

describe('InboxEmailPdfExportService', () => {
  let service: InboxEmailPdfExportService;
  let mockTranslateService: any;
  let mockPdf: any;

  const baseData: InboxEmailPrintData = {
    subject: 'Test Subject',
    bodyHtml: null,
    bodyText: 'Plain body text',
    fromName: 'Jane Doe',
    fromAddress: 'jane@klacks.ch',
    toAddress: 'inbox@klacks.ch',
    receivedDate: '2026-08-23T10:00:00Z',
    folder: 'Inbox',
  };

  beforeEach(() => {
    const translateSpy = {
      instant: vi.fn((key: string) => key),
      get: vi.fn().mockReturnValue(of('Translated text')),
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
      currentLang: 'en',
    };

    TestBed.configureTestingModule({
      providers: [
        InboxEmailPdfExportService,
        { provide: TranslateService, useValue: translateSpy },
      ],
    });

    service = TestBed.inject(InboxEmailPdfExportService);
    mockTranslateService = TestBed.inject(TranslateService) as any;

    mockPdf = {
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      setLineWidth: vi.fn(),
      text: vi.fn(),
      line: vi.fn(),
      addPage: vi.fn(),
      splitTextToSize: vi.fn((text: string) => (text ? [text] : [''])),
      getLineHeight: vi.fn().mockReturnValue(5),
      output: vi.fn().mockReturnValue(new Blob()),
      internal: {
        scaleFactor: 72 / 25.4,
        pageSize: {
          getWidth: vi.fn().mockReturnValue(210),
          getHeight: vi.fn().mockReturnValue(297),
        },
      },
    };

    vi.spyOn(service as any, 'createPdfInstance').mockReturnValue(mockPdf);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('renders the subject as a bold title', () => {
    service.exportEmail(baseData);

    expect(mockPdf.setFont).toHaveBeenCalledWith('helvetica', 'bold');
    expect(mockPdf.text).toHaveBeenCalledWith(['Test Subject'], 20, 20);
  });

  it('renders from, to, date and folder as translated meta lines', () => {
    service.exportEmail(baseData);

    expect(mockTranslateService.instant).toHaveBeenCalledWith('inbox.detail.from');
    expect(mockTranslateService.instant).toHaveBeenCalledWith('inbox.detail.to');
    expect(mockTranslateService.instant).toHaveBeenCalledWith('inbox.detail.date');
    expect(mockTranslateService.instant).toHaveBeenCalledWith('inbox.detail.folder');
    expect(mockPdf.text).toHaveBeenCalledWith(
      expect.stringContaining('Jane Doe <jane@klacks.ch>'),
      20,
      expect.any(Number),
    );
    expect(mockPdf.text).toHaveBeenCalledWith(
      expect.stringContaining('23.08.2026'),
      20,
      expect.any(Number),
    );
  });

  it('uses the plain from address when no display name is set', () => {
    service.exportEmail({ ...baseData, fromName: '' });

    expect(mockPdf.text).toHaveBeenCalledWith(
      expect.stringContaining('jane@klacks.ch'),
      20,
      expect.any(Number),
    );
    expect(mockPdf.text).not.toHaveBeenCalledWith(
      expect.stringContaining('<jane@klacks.ch>'),
      20,
      expect.any(Number),
    );
  });

  it('renders the plain body text when no HTML body is present', () => {
    service.exportEmail(baseData);

    expect(mockPdf.text).toHaveBeenCalledWith('Plain body text', 20, expect.any(Number));
  });

  it('strips HTML tags from the body while keeping block-level line breaks', () => {
    service.exportEmail({
      ...baseData,
      bodyHtml: '<p>First paragraph</p><p>Second paragraph</p>',
      bodyText: 'ignored when HTML is present',
    });

    expect(mockPdf.text).toHaveBeenCalledWith('First paragraph', 20, expect.any(Number));
    expect(mockPdf.text).toHaveBeenCalledWith('Second paragraph', 20, expect.any(Number));
    expect(mockPdf.text).not.toHaveBeenCalledWith(
      expect.stringContaining('ignored when HTML is present'),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('converts the jsPDF line height from points to millimetres for body line spacing', () => {
    mockPdf.getLineHeight.mockReturnValue(11.5);
    mockPdf.splitTextToSize.mockImplementation((text: string) => (text ? ['line 1', 'line 2', 'line 3'] : ['']));

    service.exportEmail(baseData);

    const bodyCalls = mockPdf.text.mock.calls.filter((call: unknown[]) => call[0] === 'line 1' || call[0] === 'line 2' || call[0] === 'line 3');
    expect(bodyCalls.length).toBe(3);
    const deltaY = bodyCalls[1][2] - bodyCalls[0][2];
    expect(deltaY).toBeCloseTo(11.5 / (72 / 25.4), 5);
  });

  it('adds a new page when the body overflows the current page', () => {
    mockPdf.splitTextToSize.mockReturnValue(Array.from({ length: 80 }, (_, i) => `line ${i}`));

    service.exportEmail(baseData);

    expect(mockPdf.addPage).toHaveBeenCalled();
  });

  it('opens the generated PDF blob in a new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    try {
      service.exportEmail(baseData);

      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('blob:'), '_blank');
    } finally {
      openSpy.mockRestore();
    }
  });
});
