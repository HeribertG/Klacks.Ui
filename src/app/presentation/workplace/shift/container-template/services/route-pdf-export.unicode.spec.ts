// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Proves that the real route-PDF export renders all 25 Klacks languages: every string jsPDF draws must be
 * covered by the font that is active at that moment (jsPDF has no "fail on missing glyph", it silently drops
 * or tofus the character), and Hebrew/Arabic must be passed to the jsPDF bidi engine in logical-RTL mode.
 * Set KLACKS_PDF_SAMPLE_DIR to also write one sample PDF per language for visual inspection.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';
import { LocaleService } from 'src/app/application/services/locale.service';
import { AddressTypeEnum } from 'src/app/domain/enums/client-enum';
import {
  IContainerTemplateItem,
  IRouteInfo,
} from 'src/app/domain/models/container/container-template-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import {
  ReportScript,
  resolveBidiTextOptions,
  resolveScriptForText,
} from 'src/app/domain/models/report/report-font.model';
import { PdfUnicodeTextService } from 'src/app/domain/services/report/pdf-unicode-text.service';
import { DataReportFontService } from 'src/app/infrastructure/api/report/data-report-font.service';
import {
  PDF_ROUTE_LABELS,
  PDF_SAMPLE_LANGUAGES,
  PdfSampleLanguage,
} from 'src/app/shared/testing/pdf-language-samples.testing';
import { MapRenderingService } from './map-rendering.service';
import { RoutePdfExportService } from './route-pdf-export.service';

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = resolve(HERE, '../../../../../../assets/fonts');
const SAMPLE_DIR_ENV = 'KLACKS_PDF_SAMPLE_DIR';
const PDF_KEY_PREFIX = 'pdf.';
const RIGHT_TO_LEFT_LANGUAGES: readonly PdfSampleLanguage[] = ['ar', 'he'];
const WHITESPACE = /\s/;
const BASE = 'Neuwiesenstrasse 20, 8401 Winterthur';

interface DrawnText {
  text: string;
  font: ReturnType<jsPDF['getFont']>;
  options: Record<string, unknown> | undefined;
}

interface TtfMetadata {
  cmap: { unicode: { codeMap: Record<number, number> } };
}

function buildItem(shiftId: string, company: string, street: string, zip: string): IContainerTemplateItem {
  return {
    id: shiftId,
    shiftId,
    shift: {
      workTime: 0.5,
      client: {
        company,
        addresses: [{ type: AddressTypeEnum.customer, street, zip, city: 'Winterthur' }],
      },
    } as unknown as IShift,
    briefingTime: '00:00',
    debriefingTime: '00:00',
    travelTimeAfter: '00:00',
    travelTimeBefore: '00:05',
    timeRangeStartItem: null,
    timeRangeEndItem: null,
  };
}

function buildRouteInfo(): IRouteInfo {
  const step = (order: number, shiftId: string, name: string) => ({
    order,
    shiftId,
    name,
    address: name,
    latitude: 47.5,
    longitude: 8.7,
    distanceToNextKm: 2.5,
    travelTimeToNext: '00:04:00',
  });
  return {
    startBase: BASE,
    endBase: BASE,
    totalDistanceKm: 9.8,
    estimatedTravelTime: '00:40:00',
    travelTimeFromStartBase: '00:00:00',
    distanceFromStartBaseKm: 0,
    distanceToEndBaseKm: 1.9,
    travelTimeToEndBase: '00:03:00',
    optimizedRoute: [
      step(1, 'base', 'Kellerwind Zentrale'),
      step(2, 'shift-a', 'Zimtkater Café GmbH'),
      step(3, 'shift-b', 'Sonnhalde Optik AG'),
      step(4, 'base', 'Kellerwind Zentrale'),
    ],
    segmentDirections: [
      {
        fromName: 'Kellerwind Zentrale',
        toName: 'Zimtkater Café GmbH',
        transportMode: 'driving',
        distanceKm: 2.5,
        duration: '00:04:00',
        steps: [
          { instruction: 'Turn right onto Römerstrasse', distanceMeters: 450 },
          { instruction: 'Continue on Zürcherstrasse', distanceMeters: 1200 },
        ],
      },
    ],
  } as IRouteInfo;
}

function installRecorder(doc: jsPDF, drawn: DrawnText[]): void {
  const target = doc as unknown as { text: (...args: unknown[]) => jsPDF };
  const original = target.text.bind(doc);
  target.text = (text: unknown, x: unknown, y: unknown, options?: unknown, ...rest: unknown[]) => {
    drawn.push({
      text: Array.isArray(text) ? text.join('\n') : String(text),
      font: doc.getFont(),
      options: options as Record<string, unknown> | undefined,
    });
    return original(text, x, y, options, ...rest);
  };
}

function findMissingGlyphs(doc: jsPDF, entry: DrawnText): string[] {
  const shaped = (doc as unknown as { processArabic: (text: string) => string }).processArabic(entry.text);
  const characters = [...new Set([...entry.text, ...shaped])].filter(char => !WHITESPACE.test(char));

  if (entry.font.isStandardFont) {
    return characters.filter(char => resolveScriptForText(char, 'en') !== ReportScript.WinAnsi);
  }
  const codeMap = (entry.font.metadata as unknown as TtfMetadata).cmap.unicode.codeMap;
  return characters.filter(char => !codeMap[char.codePointAt(0) ?? 0]);
}

describe('RoutePdfExportService - Unicode rendering of all languages', () => {
  let drawn: DrawnText[];
  let capturedDoc: jsPDF | undefined;
  let language: PdfSampleLanguage;

  beforeEach(() => {
    drawn = [];
    capturedDoc = undefined;
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:route-pdf');
    vi.spyOn(window, 'open').mockReturnValue({} as Window);

    TestBed.configureTestingModule({
      providers: [
        RoutePdfExportService,
        {
          provide: TranslateService,
          useValue: {
            get currentLang() {
              return language;
            },
            instant: (key: string) =>
              key.startsWith(PDF_KEY_PREFIX)
                ? PDF_ROUTE_LABELS[language][key.substring(PDF_KEY_PREFIX.length)] ?? key
                : key,
          },
        },
        { provide: LocaleService, useValue: { getLocale: () => 'en-US' } },
        { provide: MapRenderingService, useValue: { generateRouteMapCanvas: async () => null } },
        {
          provide: DataReportFontService,
          useValue: {
            loadFontAsBase64: async (fileName: string) =>
              readFileSync(join(FONT_DIR, fileName)).toString('base64'),
          },
        },
      ],
    });

    const pdfUnicodeText = TestBed.inject(PdfUnicodeTextService);
    const realPrepare = pdfUnicodeText.prepareDocument.bind(pdfUnicodeText);
    vi.spyOn(pdfUnicodeText, 'prepareDocument').mockImplementation(async (doc, sources) => {
      capturedDoc = doc;
      installRecorder(doc, drawn);
      await realPrepare(doc, sources);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function exportFor(
    lang: PdfSampleLanguage,
    items: IContainerTemplateItem[] = [
      buildItem('shift-a', 'Zimtkater Café GmbH', 'Unterer Graben 5', '8400'),
      buildItem('shift-b', 'Sonnhalde Optik AG', 'Römerstrasse 150', '8404'),
    ]
  ): Promise<jsPDF> {
    language = lang;
    const service = TestBed.inject(RoutePdfExportService);
    await service.exportRouteToPdf(
      items,
      buildRouteInfo(),
      'Servicetour Winterthur',
      'thursday',
      '08:00:00',
      () => PDF_ROUTE_LABELS[lang]['route-details']
    );
    expect(capturedDoc).toBeDefined();
    return capturedDoc!;
  }

  it.each(PDF_SAMPLE_LANGUAGES)('draws every character of %s with a font that contains its glyph', async lang => {
    const doc = await exportFor(lang);

    const labels = Object.values(PDF_ROUTE_LABELS[lang]);
    expect(drawn.some(entry => entry.text.includes(PDF_ROUTE_LABELS[lang]['route-summary']))).toBe(true);
    expect(labels.length).toBeGreaterThan(0);

    const failures = drawn
      .map(entry => ({ text: entry.text, font: entry.font.fontName, missing: findMissingGlyphs(doc, entry) }))
      .filter(result => result.missing.length > 0);
    expect(failures).toEqual([]);

    const sampleDir = process.env[SAMPLE_DIR_ENV];
    if (sampleDir) {
      mkdirSync(sampleDir, { recursive: true });
      writeFileSync(join(sampleDir, `route-${lang}.pdf`), Buffer.from(doc.output('arraybuffer')));
    }
  });

  it.each(RIGHT_TO_LEFT_LANGUAGES)('passes %s text to the bidi engine as logical right-to-left text', async lang => {
    await exportFor(lang);

    const summary = drawn.find(entry => entry.text.includes(PDF_ROUTE_LABELS[lang]['route-summary']));
    expect(summary?.options).toMatchObject({ ...resolveBidiTextOptions(lang), isInputRtl: true });

    const latinOnly = drawn.find(entry => entry.text === '2.50 km');
    expect(latinOnly?.options).toBeUndefined();
  });

  it('reorders Hebrew with digits and brackets into the visual order a PDF needs', () => {
    const engine = new (jsPDF as unknown as {
      __bidiEngine__: new (options: object) => { doBidiReorder: (text: string) => string };
    }).__bidiEngine__(resolveBidiTextOptions('he'));

    expect(engine.doBidiReorder('שלום 12')).toBe('12 םולש');
    expect(engine.doBidiReorder('תחנה 1 (12.5 ק"מ)')).toBe('(מ"ק 12.5) 1 הנחת');
  });

  it('keeps a left-to-right line in a left-to-right UI and only reverses the Hebrew run', () => {
    const engine = new (jsPDF as unknown as {
      __bidiEngine__: new (options: object) => { doBidiReorder: (text: string) => string };
    }).__bidiEngine__(resolveBidiTextOptions('de'));

    expect(engine.doBidiReorder('Kunde: שלום 12')).toBe('Kunde: 12 םולש');
  });

  it('renders a Hebrew customer in a German UI with the Hebrew font and a left-to-right line', async () => {
    const doc = await exportFor('de', [buildItem('shift-a', 'שלום בע"מ', 'Unterer Graben 5', '8400')]);

    const customerCell = drawn.find(entry => entry.text.includes('שלום'));
    expect(customerCell?.font.fontName).toBe('NotoSansHebrew');
    expect(customerCell?.options).toMatchObject({ isInputVisual: false, isInputRtl: false });
    expect(findMissingGlyphs(doc, customerCell!)).toEqual([]);
  });

  it('keeps Latin text in the standard font so existing layouts do not change', async () => {
    await exportFor('de');

    expect(drawn.every(entry => entry.font.isStandardFont)).toBe(true);
  });
});
