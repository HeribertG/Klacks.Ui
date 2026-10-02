// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalizedParamsPipe } from './localized-params.pipe';

const PARAMS = {
  holiday: 'Weihnachten',
  holidayI18n: JSON.stringify({ de: 'Weihnachten', en: 'Christmas Day', ja: 'クリスマス', 'zh-cn': '圣诞节' }),
};

describe('LocalizedParamsPipe', () => {
  let pipe: LocalizedParamsPipe;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [LocalizedParamsPipe],
    });
    pipe = TestBed.inject(LocalizedParamsPipe);
    translate = TestBed.inject(TranslateService);
  });

  it('names the holiday in the current language', () => {
    translate.use('ja');

    expect(pipe.transform(PARAMS)).toEqual({ holiday: 'クリスマス' });
  });

  it('re-resolves the same parameters after a language switch', () => {
    translate.use('ja');
    expect(pipe.transform(PARAMS)).toEqual({ holiday: 'クリスマス' });

    translate.use('zh-CN');
    expect(pipe.transform(PARAMS)).toEqual({ holiday: '圣诞节' });
  });

  it('returns the same object for parameters without a multilingual companion', () => {
    const params = { hours: '11' };

    expect(pipe.transform(params)).toBe(params);
  });

  it('returns an empty object for missing parameters', () => {
    expect(pipe.transform(undefined)).toEqual({});
  });
});
