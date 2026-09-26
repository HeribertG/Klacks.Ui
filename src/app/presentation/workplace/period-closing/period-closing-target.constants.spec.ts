// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Guards the Klacksy markers of the period-closing templates: the ids the page logic reacts to must exist
 * in a template, every marker id must be unique and prefixed, and every label key must be translated in the
 * core languages (the manifest scan copies the label key verbatim).
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { EXPORTS_TAB_TARGETS, PERIOD_CLOSING_ISSUES_TARGET } from './period-closing-target.constants';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'] as const;
const PAGE_TARGET = 'period-closing';
const TARGET_PREFIX = `${PAGE_TARGET}-`;
const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(HERE, '../../../../assets/i18n');
const TARGET_REGEX = /data-klacksy-target="([^"]+)"/g;
const LABEL_KEY_REGEX = /data-klacksy-label-key="([^"]+)"/g;

function collectTemplates(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return collectTemplates(full);
    }
    return full.endsWith('.html') ? [full] : [];
  });
}

const templates = collectTemplates(HERE).map((file) => readFileSync(file, 'utf8'));
const targetIds = templates.flatMap((html) => [...html.matchAll(TARGET_REGEX)].map((m) => m[1]));
const labelKeys = new Set(templates.flatMap((html) => [...html.matchAll(LABEL_KEY_REGEX)].map((m) => m[1])));

describe('period-closing klacksy markers', () => {
  it('uses unique ids', () => {
    expect(new Set(targetIds).size).toBe(targetIds.length);
  });

  it('prefixes every id with period-closing', () => {
    targetIds.forEach((id) => expect(id === PAGE_TARGET || id.startsWith(TARGET_PREFIX), id).toBe(true));
  });

  it('marks every id the page logic reacts to', () => {
    expect(targetIds).toContain(PERIOD_CLOSING_ISSUES_TARGET);
    Object.keys(EXPORTS_TAB_TARGETS).forEach((id) => expect(targetIds, id).toContain(id));
  });

  it.each(CORE_LANGUAGES)('translates every label key in %s', (language) => {
    const translations: Record<string, string> = JSON.parse(
      readFileSync(resolve(I18N_DIR, `${language}.json`), 'utf8'),
    );

    labelKeys.forEach((key) => expect(translations[key], `${language}: ${key}`).toBeTruthy());
  });
});
