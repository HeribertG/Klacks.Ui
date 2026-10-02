// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';
import { DataReportFontService } from 'src/app/infrastructure/api/report/data-report-font.service';
import { THAI_MARK_SUBSTITUTE_ORIGINALS } from 'src/app/domain/models/report/thai-mark-positioning.model';
import { PdfUnicodeTextService } from './pdf-unicode-text.service';

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = resolve(HERE, '../../../../assets/fonts');
const THAI_TEXT = 'สร้างเมื่อ';
const HEBREW_TEXT = 'סיכום 12';
const MAI_EK = 0x0e48;

interface TtfMetadata {
  cmap: { unicode: { codeMap: Record<number, number> } };
  toUnicode: Record<number, number>;
}

describe('PdfUnicodeTextService', () => {
  let service: PdfUnicodeTextService;
  let language: string;

  beforeEach(() => {
    language = 'de';
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslateService,
          useValue: {
            get currentLang() {
              return language;
            },
          },
        },
        {
          provide: DataReportFontService,
          useValue: {
            loadFontAsBase64: async (fileName: string) => readFileSync(join(FONT_DIR, fileName)).toString('base64'),
          },
        },
      ],
    });
    service = TestBed.inject(PdfUnicodeTextService);
  });

  it('draws with the script font and restores the caller font and style afterwards', async () => {
    const doc = new jsPDF();
    await service.prepareDocument(doc, [THAI_TEXT]);
    const textSpy = vi.spyOn(doc, 'getFont');

    doc.setFont('helvetica', 'bold');
    doc.text(THAI_TEXT, 10, 10);

    expect(textSpy.mock.results.some(result => result.value.fontName === 'NotoSansThai')).toBe(true);
    expect(doc.getFont().fontName).toBe('helvetica');
    expect(doc.getFont().fontStyle).toBe('bold');
  });

  it('measures with the same font it draws with', async () => {
    const doc = new jsPDF();
    await service.prepareDocument(doc, [THAI_TEXT]);
    doc.setFont('helvetica', 'normal');

    const decoratedWidth = doc.getTextWidth(THAI_TEXT);
    const decoratedLines = doc.splitTextToSize(THAI_TEXT, 1000);
    doc.setFont('NotoSansThai', 'normal');
    const thaiWidth = doc.getTextWidth(THAI_TEXT);

    expect(decoratedWidth).toBeCloseTo(thaiWidth, 5);
    expect(decoratedLines).toEqual([THAI_TEXT]);
  });

  it('restores the caller font even when drawing throws', async () => {
    const doc = new jsPDF();
    vi.spyOn(doc, 'text').mockImplementation(() => {
      throw new Error('draw failed');
    });
    await service.prepareDocument(doc, [THAI_TEXT]);
    doc.setFont('helvetica', 'italic');

    expect(() => doc.text(THAI_TEXT, 10, 10)).toThrow('draw failed');
    expect(doc.getFont().fontName).toBe('helvetica');
    expect(doc.getFont().fontStyle).toBe('italic');
  });

  it('keeps the real Thai characters in the text layer after the mark substitution', async () => {
    const doc = new jsPDF();
    await service.prepareDocument(doc, [THAI_TEXT]);

    doc.text(THAI_TEXT, 10, 10);

    doc.setFont('NotoSansThai', 'normal');
    const metadata = doc.getFont().metadata as unknown as TtfMetadata;
    const raisedMaiEk = [...THAI_MARK_SUBSTITUTE_ORIGINALS].find(([, original]) => original === MAI_EK)![0];
    const glyphId = metadata.cmap.unicode.codeMap[raisedMaiEk];
    expect(metadata.toUnicode[glyphId]).toBe(MAI_EK);
  });

  it('registers the font of the UI language without any data', async () => {
    language = 'he';
    const doc = new jsPDF();
    await service.prepareDocument(doc);
    const fontSpy = vi.spyOn(doc, 'getFont');

    doc.text(HEBREW_TEXT, 10, 10);

    expect(fontSpy.mock.results.some(result => result.value.fontName === 'NotoSansHebrew')).toBe(true);
  });

  it('only adds bidi handling when the document chooses its fonts itself', () => {
    const doc = new jsPDF();
    const originalText = vi.spyOn(doc, 'text');
    service.enableScriptShaping(doc);

    doc.text(HEBREW_TEXT, 10, 10);
    doc.text('Latin', 10, 20);

    expect(originalText.mock.calls[0][3]).toMatchObject({ isInputVisual: false, isOutputVisual: true });
    expect(originalText.mock.calls[1][3]).toBeUndefined();
    expect(doc.getFont().fontName).toBe('helvetica');
  });

  it('refuses to add font switching to a document prepared for shaping only', async () => {
    const doc = new jsPDF();
    service.enableScriptShaping(doc);

    await expect(service.prepareDocument(doc)).rejects.toThrow();
  });
});
