// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  hasMultiLanguageParams,
  resolveMultiLanguageParams,
} from 'src/app/domain/helpers/multi-language-params.helper';

const CHRISTMAS = JSON.stringify({
  de: 'Weihnachten',
  en: 'Christmas Day',
  fr: 'Noël',
  it: 'Natale',
  ja: 'クリスマス',
  'zh-cn': '圣诞节',
  'zh-tw': '聖誕節',
});

const HOLIDAY_PARAMS = { holiday: 'Weihnachten', holidayI18n: CHRISTMAS };

describe('resolveMultiLanguageParams', () => {
  it.each([
    ['ja', 'クリスマス'],
    ['zh-CN', '圣诞节'],
    ['zh-TW', '聖誕節'],
    ['fr', 'Noël'],
  ])('names the holiday in %s', (language, expected) => {
    expect(resolveMultiLanguageParams(HOLIDAY_PARAMS, language)).toEqual({ holiday: expected });
  });

  it('keeps parameters without a multilingual companion unchanged', () => {
    expect(resolveMultiLanguageParams({ hours: '11', holiday: 'X' }, 'ja')).toEqual({ hours: '11', holiday: 'X' });
  });

  it('resolves regardless of the order of plain key and companion', () => {
    expect(resolveMultiLanguageParams({ holidayI18n: CHRISTMAS, holiday: 'Weihnachten' }, 'ja')).toEqual({
      holiday: 'クリスマス',
    });
  });

  it('keeps the plain text when the companion is malformed', () => {
    expect(resolveMultiLanguageParams({ holiday: 'Weihnachten', holidayI18n: 'not json' }, 'ja')).toEqual({
      holiday: 'Weihnachten',
    });
  });

  it('returns an empty object for missing parameters', () => {
    expect(resolveMultiLanguageParams(undefined, 'ja')).toEqual({});
  });
});

describe('hasMultiLanguageParams', () => {
  it('detects a multilingual companion', () => {
    expect(hasMultiLanguageParams(HOLIDAY_PARAMS)).toBe(true);
    expect(hasMultiLanguageParams({ hours: '11' })).toBe(false);
    expect(hasMultiLanguageParams(null)).toBe(false);
  });
});
