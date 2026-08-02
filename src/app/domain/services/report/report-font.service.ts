// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Registers the Unicode fonts a report needs and picks the right font for a given text.
 * Without this the PDF falls back to the built-in jsPDF fonts, which drop every character
 * outside the WinAnsi range (Greek, Cyrillic, Hebrew, Arabic, Thai, Japanese, Korean, Chinese).
 * @param doc - jsPDF document the fonts are registered in
 * @param texts - Every text that will be rendered, used to decide which fonts to load
 * @param preferredFamily - Font family chosen in the report designer, kept when it can render the text
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';

import { DataReportFontService } from 'src/app/infrastructure/api/report/data-report-font.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  ReportScript,
  UNICODE_FONTS,
  UnicodeFontDefinition,
  detectScripts,
  getFontDefinition,
  resolveScriptForText,
} from 'src/app/domain/models/report/report-font.model';

const FONT_STYLE_NORMAL = 'normal';
const FONT_STYLE_BOLD = 'bold';
const FONT_STYLE_ITALIC = 'italic';
const FONT_STYLE_BOLD_ITALIC = 'bolditalic';

@Injectable({ providedIn: 'root' })
export class ReportFontService {
  private fontApi = inject(DataReportFontService);
  private translate = inject(TranslateService);

  private readonly fileCache = new Map<string, string>();
  private readonly pendingLoads = new Map<string, Promise<string>>();
  private readonly registeredFonts = new WeakMap<jsPDF, Set<ReportScript>>();

  private get uiLanguage(): string {
    return this.translate.currentLang || DomainMessages.DEFAULT_LANG;
  }

  /**
   * Loads and registers every font the given texts require.
   * Must be awaited before rendering starts, because jsPDF applies fonts synchronously.
   */
  async registerFontsForTexts(
    doc: jsPDF,
    texts: Iterable<string>,
    explicitFamilies: Iterable<string> = []
  ): Promise<void> {
    const required = new Set<ReportScript>();
    const language = this.uiLanguage;

    for (const text of texts) {
      for (const script of detectScripts(text, language)) {
        required.add(script);
      }
    }

    for (const family of explicitFamilies) {
      const definition = UNICODE_FONTS.find(font => font.family === family);
      if (definition) {
        required.add(definition.script);
      }
    }

    const registered = this.registeredFonts.get(doc) ?? new Set<ReportScript>();
    const missing = [...required].filter(script => !registered.has(script));
    if (missing.length === 0) {
      this.registeredFonts.set(doc, registered);
      return;
    }

    await Promise.all(missing.map(script => this.registerFont(doc, script, registered)));
    this.registeredFonts.set(doc, registered);
  }

  /**
   * Returns the font family that can render the text.
   * Falls back to the designer choice whenever the standard fonts are sufficient
   * so existing templates keep their appearance.
   */
  resolveFontFamily(doc: jsPDF, text: string, preferredFamily: string): string {
    const script = resolveScriptForText(text ?? '', this.uiLanguage);
    if (script === ReportScript.WinAnsi) {
      return preferredFamily;
    }

    const definition = getFontDefinition(script);
    if (!definition) {
      return preferredFamily;
    }

    const registered = this.registeredFonts.get(doc);
    return registered?.has(script) ? definition.family : preferredFamily;
  }

  private async registerFont(doc: jsPDF, script: ReportScript, registered: Set<ReportScript>): Promise<void> {
    const definition = getFontDefinition(script);
    if (!definition) {
      return;
    }

    const boldFile = definition.boldFile ?? definition.regularFile;

    try {
      await this.addFontFile(doc, definition, definition.regularFile, FONT_STYLE_NORMAL);
      await this.addFontFile(doc, definition, boldFile, FONT_STYLE_BOLD);
      await this.addFontFile(doc, definition, definition.regularFile, FONT_STYLE_ITALIC);
      await this.addFontFile(doc, definition, boldFile, FONT_STYLE_BOLD_ITALIC);
      registered.add(script);
    } catch {
      // A missing font file must not abort the report; the text degrades to the standard font.
    }
  }

  private async addFontFile(
    doc: jsPDF,
    definition: UnicodeFontDefinition,
    fileName: string,
    style: string
  ): Promise<void> {
    const base64 = await this.loadFile(fileName);
    doc.addFileToVFS(fileName, base64);
    doc.addFont(fileName, definition.family, style);
  }

  private loadFile(fileName: string): Promise<string> {
    const cached = this.fileCache.get(fileName);
    if (cached) {
      return Promise.resolve(cached);
    }

    const pending = this.pendingLoads.get(fileName);
    if (pending) {
      return pending;
    }

    const load = this.fontApi
      .loadFontAsBase64(fileName)
      .then(base64 => {
        this.fileCache.set(fileName, base64);
        this.pendingLoads.delete(fileName);
        return base64;
      })
      .catch(error => {
        this.pendingLoads.delete(fileName);
        throw error;
      });

    this.pendingLoads.set(fileName, load);
    return load;
  }
}
