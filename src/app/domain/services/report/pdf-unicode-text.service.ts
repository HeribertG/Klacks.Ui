// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Makes a jsPDF document render every Klacks language without per-call font handling in the exporters.
 * It registers the embedded Noto fonts the document needs and decorates the document instance so that
 * drawing and measuring always use a font that contains the glyphs of the text, Hebrew and Arabic are
 * reordered from logical to visual order and Thai marks get their stacked positions.
 * jspdf-autotable draws and measures through the same instance methods, so tables are covered as well.
 * @param doc - jsPDF document to prepare; the decoration only affects this instance
 * @param contentSources - Data the document will print (objects, arrays or strings); every string inside
 *   is scanned to find the scripts that need a font. Translated labels are covered by the UI language.
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';

import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  ReportScript,
  containsRightToLeftText,
  detectScripts,
  getFontDefinition,
  isUnicodeFontFamily,
  resolveBidiTextOptions,
  resolveLanguageScript,
} from 'src/app/domain/models/report/report-font.model';
import {
  THAI_MARK_SUBSTITUTE_ORIGINALS,
  containsThai,
  positionThaiMarks,
} from 'src/app/domain/models/report/thai-mark-positioning.model';
import { collectStrings } from 'src/app/domain/helpers/collect-strings.helper';
import { ReportFontService } from './report-font.service';

const DEFAULT_BASE_FONT_FAMILY = 'helvetica';
const TEXT_LINE_SEPARATOR = '\n';

type PdfText = string | string[];
type TextMethod = (text: PdfText, x: number, y: number, options?: object, ...rest: unknown[]) => jsPDF;
type MeasureMethod<TResult> = (text: PdfText, ...rest: unknown[]) => TResult;

interface TtfFontMetadata {
  cmap: { unicode: { codeMap: Record<number, number> } };
  toUnicode: Record<number, number>;
}

interface DocumentFontState {
  baseFamily: string;
  depth: number;
  switchFonts: boolean;
}

const ALREADY_SHAPING_ONLY_ERROR =
  'The PDF document was prepared for script shaping only; font switching cannot be added afterwards.';

@Injectable({ providedIn: 'root' })
export class PdfUnicodeTextService {
  private fontService = inject(ReportFontService);
  private translate = inject(TranslateService);

  private readonly preparedDocuments = new WeakMap<jsPDF, DocumentFontState>();
  private readonly thaiFamily = getFontDefinition(ReportScript.Thai)?.family;

  private get uiLanguage(): string {
    return this.translate.currentLang || DomainMessages.DEFAULT_LANG;
  }

  /**
   * Registers the fonts for the UI language and for all strings in the content sources and installs
   * the font and bidi handling on the document. Must be awaited before the first text is drawn.
   */
  async prepareDocument(doc: jsPDF, contentSources: readonly unknown[] = []): Promise<void> {
    const language = this.uiLanguage;
    const scripts = new Set<ReportScript>([resolveLanguageScript(language)]);
    for (const text of collectStrings(contentSources)) {
      for (const script of detectScripts(text, language)) {
        scripts.add(script);
      }
    }

    await this.fontService.registerFontsForScripts(doc, scripts);
    this.decorate(doc, true);
  }

  /**
   * Installs only the script shaping (bidi order for Hebrew/Arabic, Thai mark positions) for documents
   * that choose their fonts themselves, such as the report designer output.
   */
  enableScriptShaping(doc: jsPDF): void {
    this.decorate(doc, false);
  }

  private decorate(doc: jsPDF, switchFonts: boolean): void {
    const existing = this.preparedDocuments.get(doc);
    if (existing) {
      if (switchFonts && !existing.switchFonts) {
        throw new Error(ALREADY_SHAPING_ONLY_ERROR);
      }
      return;
    }
    const state: DocumentFontState = { baseFamily: DEFAULT_BASE_FONT_FAMILY, depth: 0, switchFonts };
    this.preparedDocuments.set(doc, state);

    const originalText = doc.text.bind(doc) as unknown as TextMethod;
    const drawShaped: TextMethod = (text, x, y, options, ...rest) => {
      const usesThaiFont = doc.getFont().fontName === this.thaiFamily && containsThai(joinText(text));
      const drawnText = usesThaiFont ? mapText(text, positionThaiMarks) : text;
      const result = originalText(drawnText, x, y, this.withBidiOptions(text, options), ...rest);
      if (usesThaiFont) {
        this.restoreThaiTextLayer(doc);
      }
      return result;
    };
    const decoratedText: TextMethod = switchFonts
      ? (text, x, y, options, ...rest) =>
          this.withFontFor(doc, state, text, () => drawShaped(text, x, y, options, ...rest))
      : drawShaped;
    (doc as unknown as { text: TextMethod }).text = decoratedText;

    if (switchFonts) {
      this.decorateMeasure(doc, state, 'getTextWidth');
      this.decorateMeasure(doc, state, 'getStringUnitWidth');
      this.decorateMeasure(doc, state, 'splitTextToSize');
    }
  }

  private decorateMeasure(
    doc: jsPDF,
    state: DocumentFontState,
    method: 'getTextWidth' | 'getStringUnitWidth' | 'splitTextToSize'
  ): void {
    const target = doc as unknown as Record<string, MeasureMethod<unknown>>;
    const original = target[method].bind(doc);
    target[method] = (text: PdfText, ...rest: unknown[]) =>
      this.withFontFor(doc, state, text, () => original(text, ...rest));
  }

  /**
   * Runs a draw or measure call with the font that can render the text and restores the caller's font
   * afterwards, so the exporters keep full control over family, style and size of Latin text.
   * Nested calls (jsPDF measuring inside text()) run unchanged because the font is already switched.
   */
  private withFontFor<TResult>(doc: jsPDF, state: DocumentFontState, text: PdfText, action: () => TResult): TResult {
    if (state.depth > 0) {
      return action();
    }

    const current = doc.getFont();
    if (!isUnicodeFontFamily(current.fontName)) {
      state.baseFamily = current.fontName;
    }

    const targetFamily = this.fontService.resolveFontFamily(doc, joinText(text), state.baseFamily);
    const needsSwitch = targetFamily !== current.fontName;

    state.depth++;
    try {
      if (needsSwitch) {
        doc.setFont(targetFamily, current.fontStyle);
      }
      return action();
    } finally {
      if (needsSwitch) {
        doc.setFont(current.fontName, current.fontStyle);
      }
      state.depth--;
    }
  }

  /**
   * Points the ToUnicode entries of the private-use Thai mark glyphs back to the real characters,
   * so copying or searching the PDF text still finds the original Thai text.
   */
  private restoreThaiTextLayer(doc: jsPDF): void {
    const metadata = doc.getFont().metadata as unknown as TtfFontMetadata;
    for (const [substitute, original] of THAI_MARK_SUBSTITUTE_ORIGINALS) {
      const glyphId = metadata.cmap.unicode.codeMap[substitute];
      if (glyphId && metadata.toUnicode[glyphId] === substitute) {
        metadata.toUnicode[glyphId] = original;
      }
    }
  }

  private withBidiOptions(text: PdfText, options: object | undefined): object | undefined {
    if (!containsRightToLeftText(joinText(text))) {
      return options;
    }
    return { ...resolveBidiTextOptions(this.uiLanguage), ...(options ?? {}) };
  }
}

function mapText(text: PdfText, transform: (line: string) => string): PdfText {
  return Array.isArray(text) ? text.map(transform) : transform(text);
}

function joinText(text: PdfText): string {
  if (Array.isArray(text)) {
    return text.join(TEXT_LINE_SEPARATOR);
  }
  return typeof text === 'string' ? text : String(text ?? '');
}

